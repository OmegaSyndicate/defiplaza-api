import { Request } from "itty-router";
import { generatePairId } from "../lib/pairs";
import { getActivePairs, getSwaps, getSwapsByPair, getTokens, Token } from "../lib/thegraph";
import { dfpResponse } from "../lib/util";

type Ticker = {
	ticker_id: string,
	base_currency: string,
	target_currency: string,
	last_price: number,			// Last transacted price of base currency based on given target currency
	base_volume: number,			// 24 hour trading volume in base pair volume
	target_volume: number,		// 24 hour trading volume in target pair volume
	bid: number,					// Current highest bid price. Since we have no orderbook, the same as last_price
	ask: number,					// Current lowest ask price. Since we have no orderbook, the same as last_price
	high: number,					// Rolling 24-hours highest transaction price
	low: number						// Rolling 24-hours lowest transaction price
}

type History = {
	trade_id: number,				// A unique ID associated with the trade for the currency pair transaction.
	price: number,					// Transaction price in base pair volume.
	base_volume: number,			// Transaction amount in base pair volume.
	target_volume: number,		// Transaction amount in target pair volume.
	trade_timestamp: number,
	type: string // "buy" | "sell"
}

/**
 * The /pairs endpoint provides a summary on cryptoasset trading pairs available on the exchange.
 * @param request 
 * @returns Promise<Response>
 */
export async function handleCGPairsRequest(request: Request): Promise<Response> {
	const cacheKey = request.url;
	const cache = caches.default;

	let response = await cache.match(cacheKey);

	if (response) {
		console.log("Returning from cache:", cacheKey);
		return response;
	}

	// Result is not in cache
	console.log("Result is not in cache:", cacheKey);

	const pairs = await getActivePairs();

	response = dfpResponse(pairs);

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

export async function handleCGTickerRequest(request: Request): Promise<Response> {
	const cacheKey = request.url;
	const cache = caches.default;

	let response = await cache.match(cacheKey);

	if (response) {
		console.log("Returning from cache:", cacheKey);
		return response;
	}

	// Result is not in cache
	console.log("Result is not in cache:", cacheKey);

	const dayAgo = Math.floor(new Date().getTime() / 1000) - 86400;
	const symbols = await getTokens();
	const swaps = await getSwaps(dayAgo);
	let tickers: Ticker[] = [];

	for (let tokenA of symbols) {
		for (let tokenB of symbols) {
			// No token pairs of same symbol
			// and no tokens where A is alfabetaically larger than B
			if (tokenA.symbol >= tokenB.symbol) {
				continue;
			}

			if ((!tokenA.tokenAmount || tokenA.tokenAmount <= 0) ||
				(!tokenB.tokenAmount || tokenB.tokenAmount <= 0)) {
				continue;
			}

			const pairId = generatePairId(tokenA.symbol, tokenB.symbol);
			let price = 0;

			let pairTokens = pairId.split('_');

			// display price in base amount. So USDC amount / DFP2 amount = DFP2 price
			if (pairTokens[0] == tokenA.symbol) {
				price = tokenB.tokenAmount / tokenA.tokenAmount;
			} else {
				price = tokenA.tokenAmount / tokenB.tokenAmount;
			}

			// Get swaps of last 24 hours			
			let baseVolume = 0;
			let quoteVolume = 0;
			let lowPrice = 0;
			let highPrice = 0;

			for (let swap of swaps) {
				if (swap.pair.id !== pairId) {
					continue;
				}

				let swapPrice;

				// for pair DFP2_USDC, a transaction from DFP2 to USDC is a sell
				if (swap.inputToken.symbol === tokenA.symbol) {
					baseVolume += parseFloat(swap.inputAmount);
					quoteVolume += parseFloat(swap.outputAmount);

					// display price in base amount. So USDC amount / DFP2 amount = DFP2 price
					swapPrice = parseFloat(swap.outputAmount) / parseFloat(swap.inputAmount)

				// for pair DFP2_USDC, a transaction from USDC to DFP2 is a buy
				} else {
					quoteVolume += parseFloat(swap.inputAmount);
					baseVolume += parseFloat(swap.outputAmount);

					// display price in base amount. So USDC amount / DFP2 amount = DFP2 price
					swapPrice = parseFloat(swap.inputAmount) / parseFloat(swap.outputAmount)
				}

				// Calculate 24 hour high price
				if (swapPrice > highPrice) {
					highPrice = swapPrice;
				}

				// Calculate 24 hour low price
				if (!lowPrice) {
					lowPrice = swapPrice;
				}

				if (swapPrice < lowPrice) {
					lowPrice = swapPrice;
				}
			}

			tickers.push({
				ticker_id: pairId,
				base_currency: tokenA.symbol,
				target_currency: tokenB.symbol,
				last_price: price,
				base_volume: baseVolume,
				target_volume: quoteVolume,
				bid: price,
				ask: price,
				high: highPrice || price,
				low: lowPrice || price
			} as Ticker)
		}
	}

	response = dfpResponse(tickers);

	// Cache API respects Cache-Control headers. Setting s-max-age to X
	// will limit the response to be in cache for X seconds max
	const cacheSeconds = 450;

	// Any changes made to the response here will be reflected in the cached value
	response.headers.append('Cache-Control', 's-maxage=' + cacheSeconds);

	// Store the fetched response as cacheKey
	// Use waitUntil so you can return the response without blocking on
	// writing to cache
	await cache.put(cacheKey, response.clone());

	return response;
}

export async function handleCGHistoryRequest(request: Request): Promise<Response> {
	const pair = request.query?.ticker_id || "DFP2_ETH";
	const type = request.query?.type;
	const start_time = Math.floor(parseInt(request.query?.start_time || "0")/1000);
	const end_time = Math.floor(parseInt(request.query?.end_time || "0")/1000);
	const limit = parseInt(request.query?.limit || "0");

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
	const swaps = await getSwapsByPair(pair, start_time, end_time);
	let trades: History[] = [];

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

		// If a type is specified, ignore the other side
		if (type && type !== side) {
			continue;
		}

		let trade: History = {
			trade_id: swap.id,
			trade_timestamp: swap.timestamp * 1000,
			// display price in base amount. So USDC amount / DFP2 amount = DFP2 price
			price: parseFloat(quoteAmount) / parseFloat(baseAmount),
			base_volume: +baseAmount,
			target_volume: +quoteAmount,
			type: side
		}

		trades.push(trade);
	}

	if (limit && limit > 0) {
		trades = trades.slice(0, limit);
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