import { Request, Router } from 'itty-router'
import { handleDFP2Request } from './exchanges/defiplaza';
import { handleInfoRequest, handleMarketsRequest, handleOrderBookRequest, handleTradesRequest } from './exchanges/nomics';

const router = Router();

router.get("/", () => {
  return new Response("Hello, world! This is the root page of your Worker template.")
});

/**
 * DefiPlaza
 */
router.get("/dfp2", (request: Request) => {
  return handleDFP2Request(request);
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
 * CMC DFP2 token
 */
router.get("/cmc/dfp2-total-supply", (request: Request) => {
  return handleDFP2TotalSupplyRequest(request);
});
router.get("/cmc/dfp2-circulating-supply", (request: Request) => {
  return handleDFP2TotalSupplyRequest(request);
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