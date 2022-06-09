import { Request, Router } from 'itty-router'
import { handleDFP2TotalSupplyRequest } from './exchanges/cmc';
import { handleDFP2Request } from './exchanges/defiplaza';
import { handleInfoRequest, handleMarketsRequest, handleOrderBookRequest, handleTradesRequest } from './exchanges/nomics';
import { handleContact } from './lib/contact';

const router = Router();

router.post("/contact", async (request: Request) => {
  return handleContact(request);
});

/**
 * DefiPlaza
 */
router.get("/dfp2", (request: Request) => {
  return handleDFP2Request(request);
});
router.get("/dfp2/total-supply", (request: Request) => {
  return handleDFP2TotalSupplyRequest(request);
});
router.get("/dfp2/circulating-supply", (request: Request) => {
  return handleDFP2CirculatingSupplyRequest(request);
});

/**
 * Nomics
 */
router.get("/nomics/info", (request: Request) => {
  return handleInfoRequest(request);
});

router.get("/nomics/markets", (request: Request) => {
  return handleMarketsRequest(request);
});

router.get("/nomics/trades?", (request: Request) => {
  return handleTradesRequest(request);
});

router.get("/nomics/orders/snapshot", (request: Request) => {
  return handleOrderBookRequest(request);
});

/**
 * CoinGecko
 */
router.get("/cg/pairs", (request: Request) => {
  return handleCGPairsRequest(request);
});

router.get("/cg/tickers", (request: Request) => {
  return handleCGTickerRequest(request);
});

router.get("/cg/historical_trades", (request: Request) => {
  return handleCGHistoryRequest(request);
});

/**
 * CoinMarketCap DFP2 token
 */
router.get("/cmc/dfp2-total-supply", (request: Request) => {
  return handleDFP2TotalSupplyRequest(request);
});
router.get("/cmc/dfp2-circulating-supply", (request: Request) => {
  return handleDFP2CirculatingSupplyRequest(request);
});

// 404
router.all("*", () => new Response("404, not found!", { status: 404 }))

/*
This snippet ties our worker to the router we deifned above, all incoming requests
are passed to the router where your routes are called and the response is sent.
*/
addEventListener('fetch', (evt) => {
  evt.respondWith(router.handle(evt.request))
})