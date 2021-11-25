import { Request } from "itty-router";
import { getDFP2 } from "../lib/thegraph";
import { plainResponse } from "../lib/util";

export async function handleDFP2TotalSupplyRequest(request: Request): Promise<Response> {
	const dfp2 = await getDFP2();

	return plainResponse(dfp2.totalSupply);
}