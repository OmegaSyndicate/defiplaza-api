import { Request } from "itty-router";

const GRAPH_ENDPOINT = 'https://api.thegraph.com/subgraphs/name/omegasyndicate/defiplaza';

const tokensQuery = `
	query {
		tokens(first: 16, orderBy: symbol, orderDirection: asc) {
			symbol
			tokenAmount
		}
	}
`;

export type Token = {
	symbol: string,
	tokenAmount?: string
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
	const init = {
		headers: {
			"content-type": "application/json;charset=UTF-8",
		},
	}
	const response = await fetch(GRAPH_ENDPOINT, {
		method: 'POST',
		body: JSON.stringify({ query: query })
	})

	// if (response.error()) {
	// 	throw response.errors;
	// }

	return await response.json();
}

export async function getTokens(): Promise<string[]> {
	const result = await sendRequest(tokensQuery);
	let symbols: string[] = [];

	for (let token of result.data.tokens as Token[]) {
		symbols.push(token.symbol);
	}

	return symbols;
}

export async function getSwaps(pair: string, since?: string): Promise<any[]> {
	let sinceTimestamp = 0;
	
	if (since) {
		const swapResult = await sendRequest(`{
			swap(id:"${ since }") {
				timestamp
			}
		}`);

		sinceTimestamp = swapResult.data.swap.timestamp;
	}

	const swapsQuery = `
	{
		swaps(orderBy:timestamp, orderDirection:asc, where:{ pair: "${ pair}", timestamp_gt: ${ sinceTimestamp } }) {
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
	}
`;
	const result = await sendRequest(swapsQuery);

	return result.data.swaps as Swap[];
}

export async function getActivePairs() {
	const result = await sendRequest(`{
		pairs(first: 200) {
			id
			swapCount
		}
	}`);
	
	return result.data.pairs;
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