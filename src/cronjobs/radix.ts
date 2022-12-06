import { dfpResponse } from "../lib/util";
import { Request } from "itty-router";

declare const BridgeRequests: KVNamespace;

export async function radixBridgeConfirmations(request: Request): Promise<Response> {
	const queryBody = JSON.stringify({
		query: `{
    	    bridgeRequests(first: 30, orderBy: timestamp, orderDirection: desc) {
            id
				timestamp
            senderOnEth
            receiverOnRadix
            amount
          }
    	}`,
	});

	const res = await fetch('https://api.thegraph.com/subgraphs/name/omegasyndicate/defiplaza-bridge', {
		method: 'post',
		headers: {
			'Content-Type': 'application/json',
		},
		body: queryBody,
	});
	const subGraphData = await res.json();

	let requests = [];

	for (let request of subGraphData.data.bridgeRequests) {

		console.log(request.id)

		const res = await BridgeRequests.get(request.id);

		console.log(request.id, res)


		if (!res || res == 'pending') {
			continue;
		}

		try {

			const data = JSON.parse(res);

			if (data.status === 'confirmed') {
				continue;
			}

			const radixRes = await fetch('', {
				method: 'post',
				body: JSON.stringify(`{
					"network_identifier": {
						"network": "mainnet"
					},
					"transaction_identifier": {
						"hash": "${data.radixId}"
					}
				}`)
			});
			const radixData = await radixRes.json();

			console.log(request.id, radixData);

			return dfpResponse(radixData);
			break;

		}
		catch (e) { }
	}

	return dfpResponse({});
}