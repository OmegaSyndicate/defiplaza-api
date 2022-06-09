import { Request } from "itty-router";
import { getDFP2Balance } from "../lib/dfp2";
import { getDFP2 } from "../lib/thegraph";
import { plainResponse } from "../lib/util";

const BLACKHOLE_ADDRESS = '0x56bBA67F78605DD5A42CeAe8Ec172D058e6281dd';
const JAZZER_ADDRESS = '0x2f7ab204f3675353F37c70f180944a65b9890a9a';
const TREBEL_ADDRESS = '0x4Bc760C7997a2833c974A85420c5A35d93f26Be8';
const UIGUY_ADDRESS = '0x29961513051affe355f6db49cb7e81b4970b4492';
const MULTISIG_ADDRESS = '0x040e79477e46f239732dfad65e620ce0603370cd';

export async function handleDFP2TotalSupplyRequest(request: Request): Promise<Response> {
	const cacheKey = request.url;
	const cache = caches.default;

	let response = await cache.match(cacheKey);

	if (response) {
		return response;
	}

	const dfp2 = await getDFP2();
	const burned = await getDFP2Balance(BLACKHOLE_ADDRESS);

	const totalSupply = dfp2.totalSupply - burned

	response = plainResponse(totalSupply.toString());

	// Cache API respects Cache-Control headers. Setting s-max-age to X
	// will limit the response to be in cache for X seconds max
	const cacheSeconds = 3600;

	// Any changes made to the response here will be reflected in the cached value
	response.headers.append('Cache-Control', 's-maxage=' + cacheSeconds);

	// Store the fetched response as cacheKey
	// Use waitUntil so you can return the response without blocking on
	// writing to cache
	await cache.put(cacheKey, response.clone());

	return response;
}

export async function handleDFP2CirculatingSupplyRequest(request: Request): Promise<Response> {
	const cacheKey = request.url;
	const cache = caches.default;

	let response = await cache.match(cacheKey);

	if (response) {
		return response;
	}

	const dfp2 = await getDFP2();
	let locked = 0;

	locked += await getDFP2Balance(BLACKHOLE_ADDRESS);
	locked += await getDFP2Balance(JAZZER_ADDRESS);
	locked += await getDFP2Balance(TREBEL_ADDRESS);
	locked += await getDFP2Balance(UIGUY_ADDRESS);
	locked += await getDFP2Balance(MULTISIG_ADDRESS);

	const totalSupply = dfp2.totalSupply - locked

	response = plainResponse(totalSupply.toString());

	// Cache API respects Cache-Control headers. Setting s-max-age to X
	// will limit the response to be in cache for X seconds max
	const cacheSeconds = 3600;

	// Any changes made to the response here will be reflected in the cached value
	response.headers.append('Cache-Control', 's-maxage=' + cacheSeconds);

	// Store the fetched response as cacheKey
	// Use waitUntil so you can return the response without blocking on
	// writing to cache
	await cache.put(cacheKey, response.clone());

	return response;
}