import {
	Configuration,
	RadixNetworkConfig,
	StatusApi,
	TransactionApi,
	TransactionStatus,
	TransactionStatusResponse,
	TransactionSubmitResponse,
} from "@radixdlt/babylon-gateway-api-sdk";
import {
	Bytes,
	Convert,
	ManifestBuilder,
	MapEntry,
	NetworkId,
	PrivateKey,
	RadixEngineToolkit,
	TransactionBuilder,
	TransactionManifest,
	ValueKind,
	address,
	array,
	bucket,
	decimal,
	enumeration,
	generateRandomNonce,
	map,
	nonFungibleLocalId,
	proof,
	u8,
} from "@radixdlt/radix-engine-toolkit";
import { RADIX_GATEWAY_URL, RADIX_NETWORK_ID } from "./util";

declare const PRIVATE_KEY: Bytes;

const NetworkConfiguration = {
	gatewayBaseUrl: RADIX_GATEWAY_URL,
	networkId: RADIX_NETWORK_ID,
};

export async function sendTransaction(manifest: TransactionManifest) {
	// Setting up the Gateway Sub-APIs that will be used in this example. We will be utilizing two sub
	// APIs: the Status API to get the current epoch and the transaction API to submit and query the
	// status of transactions on the network.
	const apiConfiguration = new Configuration({
		basePath: NetworkConfiguration.gatewayBaseUrl,
	});
	const statusApi = new StatusApi(apiConfiguration);
	const transactionApi = new TransactionApi(apiConfiguration);

	// Setting up the private key of the transaction notary.
	const notaryPrivateKey = new PrivateKey.Secp256k1(
		PRIVATE_KEY
	);

	const convertedInstructions = await RadixEngineToolkit.Instructions.convert(
		manifest.instructions,
		RADIX_NETWORK_ID,
		"String"
	);

	// With the manifest constructed above, we may now construct the complete transaction. Part of the
	// transaction construction requires knowledge of the ledger state, more specifically, we need to
	// have knowledge of the current epoch of the network to set the epoch bounds in the transaction
	// header. This information can be obtained from the gateway API through the status API.
	const currentEpoch = await getCurrentEpoch(statusApi);

	const notarizedTransaction = await TransactionBuilder.new().then((builder) =>
		builder
			.header({
				networkId: NetworkConfiguration.networkId,
				startEpochInclusive: currentEpoch,
				endEpochExclusive: currentEpoch + 10,
				nonce: generateRandomNonce(),
				notaryPublicKey: notaryPrivateKey.publicKey(),
				notaryIsSignatory: true,
				tipPercentage: 0,
			})
			.manifest(manifest)
			.notarize(notaryPrivateKey)
	);
	// After the transaction has been built, we can get the transaction id (transaction hash) which is
	// the identifier used to get information on this transaction through the gateway.
	const transactionId =
		await RadixEngineToolkit.NotarizedTransaction.intentHash(
			notarizedTransaction
		);
	// console.log("Transaction ID:", transactionId);

	// After the transaction has been built, it can be printed to the console as a JSON string if the
	// developer wishes to inspect it visually in any way.
	// console.log("Transaction:", notarizedTransaction);

	// To submit the transaction to the Gateway API, it must first be compiled or converted from its
	// human readable format down to an array of bytes that can be consumed by the gateway. This can
	// be done by calling the compile method on the transaction object.
	const compiledTransaction = await RadixEngineToolkit.NotarizedTransaction.compile(notarizedTransaction);
	// console.log(
	// 	"Compiled Transaction:",
	// 	Convert.Uint8Array.toHexString(compiledTransaction)
	// );

	// Now that we have the compiled transaction, we can submit it to the Gateway API.
	// console.log("Will submit now");

	const submissionResult = await submitTransaction(
		transactionApi,
		compiledTransaction
	);
	// console.log("Transaction submission result:", submissionResult);
	// There will be some time needed for the transaction to be propagated to nodes and then processed
	// by the network. We will poll the transaction status until the transaction is eventually
	// committed
	let transactionStatus = undefined;
	while (transactionStatus === undefined || transactionStatus?.status === TransactionStatus.Pending) {
		console.log(Convert.Uint8Array.toHexString(transactionId.hash));

		try {
			transactionStatus = await transactionApi.transactionStatus({
				transactionStatusRequest: {
					intent_hash: transactionId.id//Convert.Uint8Array.toHexString(transactionId.hash),
				},
			})
			// console.log(transactionStatus.status);

		}
		catch (err: any) {
			console.log('===============')
			console.log(transactionStatus?.error_message);
			console.log(transactionStatus?.error_message);

			const result = await err.json();
			console.log(result)
		}



		await new Promise((r) => setTimeout(r, 1000));
	}
	// console.log("Transaction Status:", transactionStatus);
	console.log(transactionStatus.status == 'CommittedSuccess' ? '✅' : '🚨', transactionStatus.status);
}



const getCurrentEpoch = async (statusApi: StatusApi): Promise<number> =>
	statusApi.gatewayStatus().then((output) => output.ledger_state.epoch);

const submitTransaction = async (
	transactionApi: TransactionApi,
	compiledTransaction: Uint8Array
): Promise<TransactionSubmitResponse> =>
	transactionApi.transactionSubmit({
		transactionSubmitRequest: {
			notarized_transaction_hex:
				Convert.Uint8Array.toHexString(compiledTransaction),
		},
	});

const getTransactionStatus = async (transactionApi: TransactionApi, transactionId: Uint8Array): Promise<TransactionStatusResponse> =>
	transactionApi.transactionStatus({
		transactionStatusRequest: {
			intent_hash: Convert.Uint8Array.toHexString(transactionId),
		},
	});