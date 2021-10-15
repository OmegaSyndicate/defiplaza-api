import { Request } from "itty-router";
import { getDFP2 } from "../lib/thegraph";

export const DEFIPLAZA_APP_URL = 'https://defiplaza.net';

const returnJsonheaders = { 'Content-type': 'application/json' }

export async function handleDFP2Request(request: Request): Promise<Response> {
	const dfp2 = await getDFP2();

	const price = dfp2.tvl / 16 / dfp2.amount;
	const marketCap = dfp2.totalSupply * price;

	console.log(price);

	return new Response(JSON.stringify({
		totalSupply: dfp2.totalSupply,
		marketCap: marketCap
	}), { headers: returnJsonheaders });
}