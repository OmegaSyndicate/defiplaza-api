import { Request } from "itty-router";
import { generatePairId } from "./pairs";
import { dfpResponse } from "./util";

const GRAPH_API_KEY = '9cdf6dcad1db0f0cfd885d48429fe527';
const GRAPH_ENDPOINT = `https://gateway.thegraph.com/api/${GRAPH_API_KEY}/subgraphs/id/DQAdCNpnahGhbMrS514pf6ZUEK39uQwLDaXPMfUa5C2u`;

const tokensQuery = `{
	tokens(orderBy: symbol, orderDirection: asc, where: { tokenAmount_gte: 0 }) {
		symbol
		tokenAmount
	}
}`;

export type Token = {
	symbol: string,
	tokenAmount?: number
}

type Pair = {
	id: string,
	base: string,
	quote: string
}

export type Swap = {
	id: string,
	timestamp: string,
	transaction: {
		id: string
	},
	sender: string
	pair: {
		id: string
	},
	inputToken: Token,
	outputToken: Token,
	inputAmount: string,
	outputAmount: string,
	swapUSD: string
}

async function sendRequest(query: any) {
	try {
		const response = await fetch(GRAPH_ENDPOINT, {
			method: 'post',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ query: query })
		});

		return await response.json();
	}
	catch (e) {
		throw e;
	}
}

export async function getTokens(): Promise<Token[]> {
	const result = await sendRequest(tokensQuery);
	
	return result.data.tokens;
}

export async function getTimestampByTransactionId(txId: string): Promise<number> {
	
	return cache('https://api.defiplaza.net/cache/thegraph/getTimestampByTransactionId', 86400 * 365, async () => {
		const timestampQuery = `{
			swap(id: "${txId}") {
				timestamp
			}
		}`;

		const swapResult = await sendRequest(timestampQuery);

		if (swapResult.data.swap?.timestamp) {
			return swapResult.data.swap.timestamp;
		}

		return 0;
	});
}

export async function getSwapsByPair(pair: string, sinceTimestamp?: number, endTimestamp?: number): Promise<any[]> {
	let where = [`pair: "${pair}"`];
	let first = '';

	if (sinceTimestamp && sinceTimestamp > 0) {
		where.push(`timestamp_gt: ${ sinceTimestamp }`);
	}

	if (endTimestamp && endTimestamp > 0) {
		where.push(`timestamp_lt: ${endTimestamp}`);
	}

	const swapsQuery = `{
		swaps(${first} orderBy:timestamp, orderDirection:asc, where: { ${ where.join(',') } }) {
			id
			timestamp
			transaction {
				id
			}
			sender,
			pair {
				id
			}
			inputToken {
				symbol
			}
			outputToken {
				symbol
			}
			inputAmount
			outputAmount
			swapUSD
		}
	}`;
	
	const result = await sendRequest(swapsQuery);

	return result.data.swaps as Swap[];
}

export async function getSwaps(sinceTimestamp: number): Promise<any[]> {
	return cache('https://api.defiplaza.net/cache/thegraph/getSwaps', 600, async () => {
	
		const swapsQuery = `{
			swaps(orderBy:timestamp, orderDirection:asc, where: { timestamp_gt: ${sinceTimestamp} }) {
				id
				timestamp
				transaction {
					id
				}
				sender,
				pair {
					id
				}
				inputToken {
					symbol
					tokenAmount
				}
				outputToken {
					symbol
					tokenAmount
				}
				inputAmount
				outputAmount
				swapUSD
			}
		}`;

		const result = await sendRequest(swapsQuery);

		return result.data.swaps as Swap[];
	});
}

export async function getActivePairs() {
	const symbols = await getTokens();
	let pairs: Pair[] = [];

	for (let tokenA of symbols) {
		for (let tokenB of symbols) {
			// No token pairs of same symbol
			// and no tokens where A is alfabetaically larger than B
			if (tokenA.symbol >= tokenB.symbol) {
				continue;
			}

			if ((tokenA.tokenAmount && tokenA.tokenAmount <= 0) ||
				(tokenB.tokenAmount && tokenB.tokenAmount <= 0)) {
				continue;
			}

			let pairId = generatePairId(tokenA.symbol, tokenB.symbol);

			pairs.push({
				id: pairId,
				base: tokenA.symbol,
				quote: tokenB.symbol
			} as Pair)
		}
	}

	return pairs;
}

export async function getDFP2() {
	const result = await sendRequest(`{
		factories(first: 1) {
			totalValueLockedUSD
			dfp2TotalSupply
		}
		tokens(first:1, where:{symbol:"DFP2"}) {
			tokenAmount
		}
	}`);

	return {
		amount: result.data.tokens[0].tokenAmount,
		totalSupply: result.data.factories[0].dfp2TotalSupply,
		tvl: result.data.factories[0].totalValueLockedUSD,
	}
}

async function cache(url: string, duration: number, callback: Function): Promise<any> {
	const cache = caches.default;
	const cacheKey = url;

	let response = await cache.match(cacheKey);

	if (response) {
		console.log("Returning from TheGraph cache:", cacheKey);
		return await response.json();
	}

	// Result is not in cache
	console.log("Result is not in TheGraph cache:", cacheKey);

	const data = await callback();

	response = dfpResponse(data);

	// Cache API respects Cache-Control headers. Setting s-max-age to X
	// will limit the response to be in cache for X seconds max
	const cacheSeconds = duration || 300;

	// Any changes made to the response here will be reflected in the cached value
	response.headers.append('Cache-Control', 's-maxage=' + cacheSeconds);

	// Store the fetched response as cacheKey
	// Use waitUntil so you can return the response without blocking on
	// writing to cache
	await cache.put(cacheKey, response);

	return data;
}