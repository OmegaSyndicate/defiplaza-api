import { Request } from "itty-router";
import { getSwapsByPair, getSwapsByPairSinceTransaction, getTokens, Token } from "../lib/thegraph";
import { generatePairId } from "../lib/pairs";
import { DEFIPLAZA_APP_URL, DEFIPLAZA_WEB_URL } from "./defiplaza";
import { dfpResponse } from "../lib/util";

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

export function handleInfoRequest(request: Request): Response {
	return dfpResponse({
		"name": "DefiPlaza",
		"description": "DefiPlaza has the lowest fees of exchange on Ethereum. Like other exchanges. It offers trades between tokens by functioning as an Automated Market Maker (AMM). What makes DefiPlaza special is that it is highly optimised to offer the lowest possible trade cost to the end user. Gas costs per trade are the lowest in the industry, and the transaction fees are very competitive at 0.1% of value traded. With the continued congestion on the network and the rising price of the native ETH token, saving on gas when doing any transaction on Ethereum is more important than ever before.\n\r\n\rThe way DefiPlaza makes such cheap trade possible is by building the entire exchange into a single smart contract, which can then be highly optimised for minimum gas consumption by hardcoding to 16 tokens. Any of these tokens can be traded against any other of these tokens, resulting in a total of 120 trading pairs. Once it has sufficient liquidity DefiPlaza will be the cheapest option for the vast majority of all swaps in DeFi. DefiPlaza is about making DeFi affordable again, even on Ethereum!",
		"location": "Netherlands",
		"logo": "https://static.defiplaza.net/website/uploads/2022/02/25160151/round-profile.png",
		"website": DEFIPLAZA_WEB_URL,
		"twitter": "defiplaza",
		"version": "1.0",
		"capability": {
			"markets": true,
			"trades": true,
			"ordersSnapshot": false,
			"candles": false,
			"ticker": false
		}
	});
}

export async function handleMarketsRequest(request: Request): Promise<Response> {
	const symbols = await getTokens();
	let markets: Market[] = [];

	for (let tokenA of symbols) {
		for (let tokenB of symbols) {
			// No token pairs of same symbol
			// and no tokens where A is alfabetaically larger than B
			if (tokenA.symbol >= tokenB.symbol) {
				continue;
			}

			let pairId = generatePairId(tokenA.symbol, tokenB.symbol);
			let active = true;

			if ((tokenA.tokenAmount && tokenA.tokenAmount <= 0) ||
				(tokenB.tokenAmount && tokenB.tokenAmount <= 0)) {
				active = false;
			}

			markets.push({
				id: pairId,
				type: 'spot',
				base: tokenA.symbol,
				quote: tokenB.symbol,
				active: active,
				market_url: DEFIPLAZA_APP_URL + '/swap?from=' + tokenA.symbol + '&to=' + tokenB.symbol,
				description: 'DefiPlaza trade pair for ' + tokenA.symbol + ' and ' + tokenB.symbol
			} as Market)
		}
	}

	return dfpResponse(markets);
}

export async function handleTradesRequest(request: Request): Promise<Response> {
	const pair = request.query?.market || "DFP2_ETH";
	const lastTransactionId = request.query?.since;

	const cacheKey = request.url;
	const cache = caches.default;

	let response = await cache.match(cacheKey);

	if (response) {
		console.log("Returning from cache:", cacheKey);
		return response;
	}

	// Result is not in cache
	console.log("Result is not in cache:", cacheKey);
	const tokenPair = pair.split("_");
	const swaps = await getSwapsByPairSinceTransaction(pair, lastTransactionId);
	let trades: Trade[] = [];

	for (let swap of swaps) {
		let base: Token;
		let baseAmount: string;
		let quote: Token;
		let quoteAmount: string;
		let side = "buy";

		// for pair DFP2_USDC, a transaction from DFP2 to USDC is a sell
		if (swap.inputToken.symbol === tokenPair[0]) {
			base = swap.inputToken;
			baseAmount = swap.inputAmount;
			quote = swap.outputToken;
			quoteAmount = swap.outputAmount;
			side = "sell";
		// for pair DFP2_USDC, a transaction from USDC to DFP2 is a buy
		} else {
			quote = swap.inputToken;
			quoteAmount = swap.inputAmount;
			base = swap.outputToken;
			baseAmount = swap.outputAmount;
			side = "buy";
		}

		let trade: Trade = {
			id: swap.id,
			timestamp: new Date(swap.timestamp * 1000).toISOString(),
			// display price in base amount. So USDC amount / DFP2 amount = DFP2 price
			price: (parseFloat(quoteAmount) / parseFloat(baseAmount)).toString(),
			amount: baseAmount,
			amount_quote: quoteAmount,
			order: swap.transaction.id,
			type: "market",
			side: side
		}

		trades.push(trade);
	}

	response = dfpResponse(trades);

	// Cache API respects Cache-Control headers. Setting s-max-age to X
	// will limit the response to be in cache for X seconds max
	const cacheSeconds = 300;

	// Any changes made to the response here will be reflected in the cached value
	response.headers.append('Cache-Control', 's-maxage=' + cacheSeconds);

	// Store the fetched response as cacheKey
	// Use waitUntil so you can return the response without blocking on
	// writing to cache
	await cache.put(cacheKey, response.clone());

	return response;
}

export function handleOrderBookRequest(request: Request): Response {
	return dfpResponse({
		"bids": [],
		"asks": [],
		"timestamp": new Date().toUTCString()
	});
}