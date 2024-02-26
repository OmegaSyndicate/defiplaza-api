import { Request, Router } from 'itty-router'
import { handleCGHistoryRequest, handleCGPairsRequest, handleCGTickerRequest } from './exchanges/cg';
import { handleCMCAssetsRequest, handleCMCHistoryRequest, handleCMCOrderBookRequest, handleCMCSummaryRequest, handleCMCTickerRequest } from './exchanges/cmc';
import { handleDFP2Request, handleDFP2CirculatingSupplyRequest, handleDFP2TotalSupplyRequest } from './exchanges/defiplaza';
import { handleInfoRequest, handleMarketsRequest, handleOrderBookRequest, handleTradesRequest } from './exchanges/nomics';
import { handleContact } from './lib/contact';

declare const PARSE_MASTER_KEY: string;

const router = Router();

router.post("/contact", async (request: Request) => {
  return handleContact(request);
});

router.get("/health", (request: Request) => {
  const plainHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  }

  return new Response('okay', { headers: plainHeaders });
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
 * CoinMarketCap token
 */
router.get("/cmc/dfp2-total-supply", (request: Request) => {
  return handleDFP2TotalSupplyRequest(request);
});
router.get("/cmc/dfp2-circulating-supply", (request: Request) => {
  return handleDFP2CirculatingSupplyRequest(request);
});

router.get("/cmc/summary", (request: Request) => {
  return handleCMCSummaryRequest(request);
});
router.get("/cmc/ticker", (request: Request) => {
  return handleCMCTickerRequest(request);
});
router.get("/cmc/assets", (request: Request) => {
  return handleCMCAssetsRequest(request);
});
router.get("/cmc/orderbook", (request: Request) => {
  return handleCMCOrderBookRequest(request);
});
router.get("/cmc/trades/:market_pair", (request: Request) => {
  return handleCMCHistoryRequest(request);
});

// 404
router.all("*", () => new Response("404, not found!", { status: 404 }));

async function handleScheduled(event: any) {

  console.log(JSON.stringify(event, null, 3));

  let promises = [];

  promises.push(fetch(`https://radix.defiplaza.net/cronjob/new-pairs`));
  promises.push(fetch(`https://radix.defiplaza.net/cronjob/last-price`));
  promises.push(fetch(`https://radix.defiplaza.net/cronjob/analytics`));
  promises.push(fetch(`https://radix.defiplaza.net/cronjob/il`));
  promises.push(fetch(`https://radix.defiplaza.net/cronjob/apy`));


  // switch (event.cron) {
  //   // You can set up to three schedules maximum.
  //   case "*/5 * * * *":
  //     promises.push(fetch(`https://radix.defiplaza.net/cronjob/new-pairs`));
  //     break;
    
  //   case "59 * * * *":
  //     promises.push(fetch(`https://radix.defiplaza.net/cronjob/analytics`));
  //     break;
   
  //   case "59 23 * * *":
  //     promises.push(fetch(`https://radix.defiplaza.net/cronjob/update-tokens`));
  //     break;
  //   default:
  //     // await generatePrices();
  //     break;
  // }

  return Promise.all(promises);
}

/*
This snippet ties our worker to the router we deifned above, all incoming requests
are passed to the router where your routes are called and the response is sent.
*/
addEventListener('fetch', (evt) => {
  evt.respondWith(router.handle(evt.request))
});

addEventListener('scheduled', event => {
  event.waitUntil(handleScheduled(event));
});