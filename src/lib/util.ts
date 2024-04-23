import { NetworkId } from "@radixdlt/radix-engine-toolkit";

export const RADIX_GATEWAY_URL = 'https://mainnet.radixdlt.com'; //'https://gateway-api.astrolescent.com';
export const RADIX_NETWORK_ID = NetworkId.Mainnet;
export const XRD_RESOURCE_ADDRESS = 'resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd';
export const ACCOUNT_ADDRESS = 'account_rdx16y0nx6uudf05vmw89zyfasf74psv09qjc04pasapeng2d25q675vtd';


const headers = {
	"content-type": "application/json;charset=UTF-8",
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
}

const plainHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
}

export function dfpResponse(jsonBody: any): Response {
	return new Response(JSON.stringify(jsonBody), { headers });
}

export function plainResponse(plainBody: string): Response {
	return new Response(plainBody, { headers: plainHeaders });
}