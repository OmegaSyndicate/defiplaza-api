import { Request } from "itty-router";

const GRAPH_ENDPOINT = 'https://api.thegraph.com/subgraphs/name/timanrebel/defi-plaza';

const tokensQuery = `
	query {
		tokens {
			symbol
			tokenAmount
		}
	}
`;

export async function handleRequest(request: Request): Promise<Response> {
  const init = {
    headers: {
      "content-type": "application/json;charset=UTF-8",
    },
  }
  const response = await fetch(GRAPH_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({ query: tokensQuery })
  })
  const results = JSON.stringify(await response.json())
  return new Response(results, init)
}
