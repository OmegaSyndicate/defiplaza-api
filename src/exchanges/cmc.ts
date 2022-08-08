import { Request } from "itty-router";
import { generatePairId } from "../lib/pairs";
import { getActivePairs, getSwaps, getSwapsByPair, getTokens, Token } from "../lib/thegraph";
import { dfpResponse } from "../lib/util";

const UNIFIED_CRYPTOASSET_ID_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?CMC_PRO_API_KEY=UNIFIED-CRYPTOASSET-INDEX&listing_status=active';

type Summary = {
	trading_pairs: string,
	base_currency: string,
	quote_currency: string,
	last_price: number,
	lowest_ask: number,
	highest_bid: number,
	base_volume: number,
	quote_volume: number,
	price_change_percent_24h: number,	// 24-hr % price change of market pair
	highest_price_24h: number,
	lowest_price_24h: number

}
type Ticker = {
	base_id: number,				// The quote pair Unified Cryptoasset ID. // https://pro-api.coinmarketcap.com/v1/cryptocurrency/map?CMC_PRO_API_KEY=UNIFIED-CRYPTOASSET-INDEX&listing_status=active
	quote_id: number,
	last_price: number,
	base_volume: number,			// 24-hour trading volume denoted in BASE currency
	quote_volume: number,
	isFrozen: number				// Indicates if the market is currently enabled (0) or disabled (1).
}

type History = {
	trade_id: number,				// A unique ID associated with the trade for the currency pair transaction.
	price: number,					// Transaction price in base pair volume.
	base_volume: number,			// Transaction amount in base pair volume.
	target_volume: number,		// Transaction amount in target pair volume.
	trade_timestamp: number,	// Unix timestamp in milliseconds for when the transaction occurred.
	type: string // "buy" | "sell"
}

type Asset = {
	name: string,
	unified_cryptoasset_id: number,		// Unique ID of cryptocurrency assigned by Unified Cryptoasset ID.
	can_withdraw: boolean,
	can_deposit: boolean,
	min_withdraw: number,
	max_withdraw: number,
	maker_fee: number,						// Fees applied when liquidity is added to the order book.
	taker_fee: number							// Fees applied when liquidity is removed from the order book.
}



/**
 * The /pairs endpoint provides a summary on cryptoasset trading pairs available on the exchange.
 * @param request 
 * @returns Promise<Response>
 */
export async function handleCMCSummaryRequest(request: Request): Promise<Response> {
	const cacheKey = request.url;
	const cache = caches.default;

	// let response = await cache.match(cacheKey);

	// if (response) {
	// 	console.log("Returning from cache:", cacheKey);
	// 	return response;
	// }

	// // Result is not in cache
	// console.log("Result is not in cache:", cacheKey);

	let summary: Summary[] = [];
	const dayAgo = Math.floor(new Date().getTime() / 1000) - 86400;
	const symbols = await getTokens();
	const swaps = await getSwaps(dayAgo);

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
			let startPrice = 0;
			let priceChange = 0;

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

				// Calculate price change
				if (startPrice === 0) {
					startPrice = swapPrice;
				} else {
					priceChange = ((swapPrice - startPrice) / startPrice) * 100;
				}
			}

			summary.push({
				trading_pairs: pairId,
				base_currency: tokenA.symbol,
				quote_currency: tokenB.symbol,
				last_price: price,
				lowest_ask: price,
				highest_bid: price,
				base_volume: baseVolume,
				quote_volume: quoteVolume,
				price_change_percent_24h: priceChange,
				highest_price_24h: highPrice || price,
				lowest_price_24h: lowPrice || price
			} as Summary)
		}
	}

	let response = dfpResponse(summary);

	// Cache API respects Cache-Control headers. Setting s-max-age to X
	// will limit the response to be in cache for X seconds max
	// const cacheSeconds = 300;

	// // Any changes made to the response here will be reflected in the cached value
	// response.headers.append('Cache-Control', 's-maxage=' + cacheSeconds);

	// // Store the fetched response as cacheKey
	// // Use waitUntil so you can return the response without blocking on
	// // writing to cache
	// await cache.put(cacheKey, response.clone());

	return response;
}

export async function handleCMCAssetsRequest(request: Request): Promise<Response> {
	const cacheKey = request.url;
	const cache = caches.default;

	let response = await cache.match(cacheKey);

	if (response) {
		console.log("Returning from cache:", cacheKey);
		return response;
	}

	// Result is not in cache
	console.log("Result is not in cache:", cacheKey);

	const tokens = await getTokens();
	const cmcIds = await getUnifiedCryptoassetIDs();
	let assets: any = {};

	for (let token of tokens) {
		for (let cmcToken of cmcIds) {
			if (cmcToken.symbol.toUpperCase() == token.symbol) {
				assets[token.symbol] = {
					name: cmcToken.name,
					unified_cryptoasset_id: cmcToken.id,
					can_withdraw: true,
					can_deposit: true,
					min_withdraw: 0,
					max_withdraw: token.tokenAmount,
					maker_fee: 0.001,
					taker_fee: 0
				} as Asset;
			}
		}
	}

	response = dfpResponse(assets);

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

export async function handleCMCTickerRequest(request: Request): Promise<Response> {
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
	const cmcIds = await getUnifiedCryptoassetIDs();

	let tickers: any = {};

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
			
			for (let swap of swaps) {
				if (swap.pair.id !== pairId) {
					continue;
				}

				// for pair DFP2_USDC, a transaction from DFP2 to USDC is a sell
				if (swap.inputToken.symbol === tokenA.symbol) {
					baseVolume += parseFloat(swap.inputAmount);
					quoteVolume += parseFloat(swap.outputAmount);

					// for pair DFP2_USDC, a transaction from USDC to DFP2 is a buy
				} else {
					quoteVolume += parseFloat(swap.inputAmount);
					baseVolume += parseFloat(swap.outputAmount);
				}
			}

			tickers[pairId] = {
				base_id: await findUnifiedCryptoassetID(cmcIds, pairTokens[0]),
				quote_id: await findUnifiedCryptoassetID(cmcIds, pairTokens[1]),
				last_price: price,
				base_volume: baseVolume,			// 24-hour trading volume denoted in BASE currency
				quote_volume: quoteVolume,
				isFrozen: 0
			} as Ticker;
		}
	}

	response = dfpResponse(tickers);

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

export function handleCMCOrderBookRequest(request: Request): Response {
	return dfpResponse({
		timestamp: (new Date()).getTime(),
		bids: [],
		asks: []
	});
}

export async function handleCMCHistoryRequest(request: Request): Promise<Response> {
	const pair = request.params?.market_pair || "DFP2_ETH";
	const type = request.query?.type;
	const start_time = Math.floor(new Date().getTime() / 1000) - 86400; // Last 24 hours
	const end_time = 0;
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

async function getUnifiedCryptoassetIDs(): Promise<any> {
	const cache = caches.default;
	const cacheKey = UNIFIED_CRYPTOASSET_ID_URL;

	let response = await cache.match(cacheKey);

	if (response) {
		console.log("Returning from cache:", cacheKey);
		return await response.json();
	}

	// Result is not in cache
	console.log("Result is not in cache:", cacheKey);

	let tokens = await getTokens();
	let symbols = [];

	for (let token of tokens) {
		symbols.push(token.symbol);
	}

	let cmcResponse = await fetch(UNIFIED_CRYPTOASSET_ID_URL + `&symbol=${ symbols.join(',') }`);
	const textResponse = await cmcResponse.text();
	let json = JSON.parse(textResponse);

	response = dfpResponse(json.data);	

	// Cache API respects Cache-Control headers. Setting s-max-age to X
	// will limit the response to be in cache for X seconds max
	const cacheSeconds = 86400;

	// Any changes made to the response here will be reflected in the cached value
	response.headers.append('Cache-Control', 's-maxage=' + cacheSeconds);

	// Store the fetched response as cacheKey
	// Use waitUntil so you can return the response without blocking on
	// writing to cache
	await cache.put(cacheKey, response);

	return json.data;
}

function findUnifiedCryptoassetID(json: any, symbol: string): number {

	let id = -1;

	for (let currency of json) {
		if (currency.symbol.toUpperCase() == symbol) {
			id = currency.id;
		}
	}

	return id as number;
	
}