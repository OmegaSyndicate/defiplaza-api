import { BigNumber } from "@ethersproject/bignumber";

const ETHERSCAN_API = 'https://api.etherscan.io/api';
const DFP2_ADDRESS = '0x2F57430a6ceDA85a67121757785877b4a71b8E6D';

declare var ETHERSCAN_API_KEY: string;

export async function getDFP2Balance(address: string): Promise<number> {
	try {
		const response = await fetch(ETHERSCAN_API + `?module=account&action=tokenbalance&contractaddress=${DFP2_ADDRESS}&address=${address}&apikey=${ETHERSCAN_API_KEY}'`);

		const jsonResponse = await response.json();
		const tenE18 = BigNumber.from('10').pow(18);
		const balance = BigNumber.from(jsonResponse.result).div(tenE18);

		return balance.toNumber();
	}
	catch (e) {
		throw e;
	}
}