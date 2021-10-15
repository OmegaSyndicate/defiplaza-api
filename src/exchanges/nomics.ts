import { Request } from "itty-router";
import { getSwaps, getTokens, Token } from "../lib/thegraph";
import { generatePairId } from "../lib/pairs";
import { DEFIPLAZA_APP_URL } from "./defiplaza";

type Market = {
	id: string,
	type: "spot",
	base: string,
	quote: string,
	active: true,
	market_url: string,
	description: string
}

type Trade = {
	id: string,
	timestamp: string,
	price: string,
	amount: string,
	amount_quote: string,
	order: string,
	type: "market",
	side: string, //"buy" | "sell",
}

const returnJsonheaders = { 'Content-type': 'application/json' }

export function handleInfoRequest(request: Request): Response {
	return new Response(JSON.stringify({
		"name": "DefiPlaza",
		"description": "DefiPlaza is a decentralized exchange. There are many other decentralized exchanges out there that you may already be familiar with, for example UniSwap. What makes DefiPlaza stand out from the crowd is that it’s highly optimized to offer the lowest possible cost to the end user. Trading fees and gas costs are significantly cheaper than at other platforms. We offer 120 direct trading pairs between the top 16 DeFi tokens, many of which can’t be found anywhere else. Defi Plaza is about making DeFi affordable again, even on Ethereum! DefiPlaza is a decentralized exchange. There are many other decentralized exchanges out there that you may already be familiar with, for example UniSwap. What makes DefiPlaza stand out from the crowd is that it’s highly optimized to offer the lowest possible cost to the end user. Trading fees and gas costs are significantly cheaper than at other platforms. We offer 120 direct trading pairs between the top 16 DeFi tokens, many of which can’t be found anywhere else. Defi Plaza is about making DeFi affordable again, even on Ethereum!",
		"location": "Netherlands",
		"logo": "https://hub.defiplaza.net/wp-content/uploads/sites/5/2021/10/defiplaza-logo-square.svg",
		"website": DEFIPLAZA_APP_URL,
		"twitter": "defiplaza",
		"version": "1.0",
		"capability": {
			"markets": true,
			"trades": true,
			"ordersSnapshot": false,
			"candles": false,
			"ticker": false
		}
	}), { headers: returnJsonheaders });
}

export async function handleMarketsRequest(request: Request): Promise<Response> {
	const symbols = await getTokens();
	let markets: Market[] = [];

	for (let tokenA of symbols) {
		for (let tokenB of symbols) {
			// No token pairs of same symbol
			// and no tokens where A is alfabetaically larger than B
			if (tokenA >= tokenB) {
				continue;
			}

			let pairId = generatePairId(tokenA, tokenB);

			markets.push({
				id: pairId,
				type: 'spot',
				base: tokenA,
				quote: tokenB,
				active: true,
				market_url: DEFIPLAZA_APP_URL + '/swap?from=' + tokenA + '&to=' + tokenB,
				description: 'DefiPlaza trade pair for ' + tokenA + ' and ' + tokenB
			} as Market)
		}
	}

	return new Response(JSON.stringify(markets), { headers: returnJsonheaders });
}

// export async function handleMarketsRequest(request: Request): Promise<Response> {
// 	const pairs = await getActivePairs();
// 	let markets: Market[] = [];

// 	for (let pair of pairs) {
// 		// for (let tokenB of symbols) {
// 		// 	// No token pairs of same symbol
// 		// 	// and no tokens where A is alfabetaically larger than B
// 		// 	if (tokenA >= tokenB) {
// 		// 		continue;
// 		// 	}

// 		// let pairId = generatePairId(tokenA, tokenB);
// 		const tokens = pair.id.split('_');
// 		const tokenA = tokens[0];
// 		const tokenB = tokens[1];

// 		markets.push({
// 			id: pair.id,
// 			type: 'spot',
// 			base: tokenA,
// 			quote: tokenB,
// 			active: true,
// 			market_url: DEFIPLAZA_APP_URL + '/swap?from=' + tokenA + '&to=' + tokenB,
// 			description: 'DefiPlaza trade pair for ' + tokenA + ' and ' + tokenB
// 		} as Market)
// 		// }
// 	}

// 	return new Response(JSON.stringify(markets), { headers: returnJsonheaders });
// }

export async function handleTradesRequest(request: Request): Promise<Response> {
	const pair = request.query?.market || "ETH_DFP2";
	const since = request.query?.since;

	const tokenPair = pair.split("_");
	const swaps = await getSwaps(pair, since);
	let trades: Trade[] = [];

	for (let swap of swaps) {
		let base: Token;
		let baseAmount: string;
		let quote: Token;
		let quoteAmount: string;
		let side = "buy";

		if (swap.inputToken.symbol === tokenPair[0]) {
			base = swap.inputToken;
			baseAmount = swap.inputAmount;
			quote = swap.outputToken;
			quoteAmount = swap.outputAmount;
			side = "buy";
		} else {
			quote = swap.inputToken;
			quoteAmount = swap.inputAmount;
			base = swap.outputToken;
			baseAmount = swap.outputAmount;
			side = "sell";
		}

		let trade: Trade = {
			id: swap.id,
			timestamp: new Date(swap.timestamp * 1000).toISOString(),
			price: (parseFloat(baseAmount) / parseFloat(quoteAmount)).toString(),
			amount: baseAmount,
			amount_quote: quoteAmount,
			order: swap.transaction.id,
			type: "market",
			side: side
		}

		trades.push(trade);
	}

	return new Response(JSON.stringify(trades), { headers: returnJsonheaders });
}

export function handleOrderBookRequest(request: Request): Response {
	return new Response(JSON.stringify({
		"bids": [],
		"asks": [],
		"timestamp": new Date().toUTCString()
	}), { headers: returnJsonheaders });
}