import { Request } from "itty-router";
import { generatePairId } from "./pairs";

const GRAPH_ENDPOINT = 'https://gateway.thegraph.com/api/97814e28c86a7184f207dad2a234d813/subgraphs/id/DQAdCNpnahGhbMrS514pf6ZUEK39uQwLDaXPMfUa5C2u';

const tokensQuery = `{
	tokens(orderBy: symbol, orderDirection: asc) {
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

export async function getSwapsByPairSinceTransaction(pair: string, txId?: string): Promise<any[]> {
	let sinceTimestamp = 0;
	
	if (txId) {
		const timestampQuery = `{
			swap(id: "${txId}") {
				timestamp
			}
		}`;

		const swapResult = await sendRequest(timestampQuery);

		if (swapResult.data.swap?.timestamp) {
			sinceTimestamp = swapResult.data.swap.timestamp;
		}
	}

	return getSwapsByPair(pair, sinceTimestamp);
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