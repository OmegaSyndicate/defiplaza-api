import { Request } from "itty-router";
import { getDFP2 } from "../lib/thegraph";
import { dfpResponse } from "../lib/util";

export const DEFIPLAZA_WEB_URL = 'https://defiplaza.net';
export const DEFIPLAZA_APP_URL = 'https://app.defiplaza.net';

export async function handleDFP2Request(request: Request): Promise<Response> {
	const dfp2 = await getDFP2();

	const price = dfp2.tvl / 16 / dfp2.amount;
	const marketCap = dfp2.totalSupply * price;

	return dfpResponse({
		marketCap: marketCap,
		price: price,
		totalSupply: dfp2.totalSupply
	});
}