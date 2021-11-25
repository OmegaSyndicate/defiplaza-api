const headers = {
	"content-type": "application/json;charset=UTF-8",
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
}

const plainHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
}

export function dfpResponse(jsonBody: any): Response {
	return new Response(JSON.stringify(jsonBody), { headers });
}

export function plainResponse(plainBody: string): Response {
	return new Response(plainBody, { headers: plainHeaders });
}