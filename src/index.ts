import { Request, Router } from 'itty-router'
import { handleCGHistoryRequest, handleCGPairsRequest, handleCGTickerRequest } from './exchanges/cg';
import { handleCMCAssetsRequest, handleCMCHistoryRequest, handleCMCOrderBookRequest, handleCMCSummaryRequest, handleCMCTickerRequest } from './exchanges/cmc';
import { handleDFP2Request, handleDFP2CirculatingSupplyRequest, handleDFP2TotalSupplyRequest } from './exchanges/defiplaza';
import { handleInfoRequest, handleMarketsRequest, handleOrderBookRequest, handleTradesRequest } from './exchanges/nomics';
import { handleContact } from './lib/contact';
import {
  Bytes,
  ManifestBuilder,
  PrivateKey,
  TransactionManifest,
  address,
  bucket,
  decimal,
  enumeration,
  expression,
  generateRandomNonce
} from "@radixdlt/radix-engine-toolkit";
import { ACCOUNT_ADDRESS, XRD_RESOURCE_ADDRESS, dfpResponse, plainResponse } from './lib/util';
import { sendTransaction } from './lib/transaction';
import Decimal from "decimal.js";



declare const PRIVATE_KEY: Bytes;
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

router.get("/timan", async (request: Request) => {

  const chunkPerTransaction = 20;

    const addresses: { address: string, amount: number }[] = [];

    try {
      const jsonArray: { address: string, amount: string }[] = [{
        address: 'account_rdx169duxdjryze9kj0007pwm80fdfazd7732n8p4cqkhccwksd6zh47nr',
        amount: '1'
      }];
      // const jsonArray: { address: string, amount: string }[] = await csv().fromFile('./airdrop.csv');

      // const rl = readline.createInterface({
      // 	input: fs.createReadStream('./airdrop.csv'),
      // 	crlfDelay: Infinity
      // });


      // rl.on('line', (line) => {
      for (let line of jsonArray) {
        console.log(line);

        if (!line.address) {
          continue;
        }

        // const valid = validateAddress(line.address);

        // console.log(`${line.address}: ${parseFloat(line.amount)}`, valid);

        // if (valid) {
          addresses.push({
            address: line.address,
            amount: parseFloat(line.amount)
          });
        // }
      }

      // await events.once(rl, 'close');
    }
    catch (err) {
      console.error(err);
    }

    console.log(`Sending to ${addresses.length} addresses.`);


    // Send tokens per 50 addresses
    let x = 0;
    for (let i = 0; i < addresses.length; i += chunkPerTransaction) {
      console.log(`Sending ${i} to ${(i + chunkPerTransaction)}`);

      const chunk = addresses.slice(i, i + chunkPerTransaction);
      const totalAmount = chunk.reduce((total, t) => total + t.amount, 0)

      // console.log(chunk[0], chunk[chunk.length - 1]);

      // We then build the transaction manifest
      const NONE = enumeration(0);
      const builder = new ManifestBuilder()
        .callMethod(ACCOUNT_ADDRESS, "lock_fee", [decimal(10)])
        .callMethod(ACCOUNT_ADDRESS, "withdraw", [address(XRD_RESOURCE_ADDRESS), decimal(totalAmount)]);

      for (let receipient of chunk) {
        // address = "account_tdx_2_1289a0cvm40qfw3amdruk732yh20w6pmwapc0mdqr4hj4dvsqc246la";

        builder.takeFromWorktop(XRD_RESOURCE_ADDRESS, new Decimal(receipient.amount), (builder, bucketId) =>
          builder.callMethod(receipient.address, 'try_deposit_or_refund', [bucket(bucketId), NONE])
        )
        x++;
      }

      builder.callMethod(ACCOUNT_ADDRESS, "deposit_batch", [expression("EntireWorktop")]);

      const manifest: TransactionManifest = builder.build();

      await sendTransaction(manifest);

      console.log(x, 'done');
    }
  
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

  let promises = [];

  switch (event.cron) {
    // You can set up to three schedules maximum.
    case "* * * * *":
      promises.push(fetch(`https://radix.defiplaza.net/cronjob/new-pairs`));
      // we cache CG response
      promises.push(fetch(`https://radix.defiplaza.net/cronjob/last-price`));
      // promises.push(fetch(`https://radix.defiplaza.net/api/cg/tickers?recache=true`));
      promises.push(fetch(`https://radix.defiplaza.net/cronjob/apy`));

      break;
    
    case "*/5 * * * *":
      promises.push(fetch(`https://radix.defiplaza.net/cronjob/analytics`));
      promises.push(fetch(`https://radix.defiplaza.net/cronjob/il`));
      break;
   
    case "59 23 * * *":
      promises.push(fetch(`https://radix.defiplaza.net/cronjob/update-tokens`));
      break;
    default:
      // await generatePrices();
      break;
  }

  return await Promise.all(promises);
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