import { dfpResponse, plainResponse } from "./util";
import { Request } from 'itty-router'
import { AwsClient } from 'aws4fetch'

declare var AWS_ACCESS_KEY_ID: string;
declare var AWS_SECRET_ACCESS_KEY: string;

export async function handleContact(request: Request): Promise<Response> {
	// let formValues: any = {}; //{ name?: string, email?: string, message?: string } = {};
	
	if (request.text) {
		let formValues = await request.text();

		const queryString = formValues.split('&')
		let params: any = {};

		queryString.forEach((item: string) => {
			const kv = item.split('=')
			if (kv[0]) {
				params[kv[0]] = decodeURIComponent(kv[1].replace(/\+/g, ' '));
			}
		});

		const body = {
			"Content": {
				"Simple": {
					"Body": {
						"Text": {
							"Charset": "UTF-8",
							"Data": `New message from: ${params?.name} (${params?.email}):

${params?.message}`
						}
					},
					"Subject": {
						"Charset": "UTF-8",
						"Data": "New message from Contact form"
					}
				},
			},
			"Destination": {
				"ToAddresses": ["trebel@defiplaza.net"]
			},
			"FromEmailAddress": "DefiPlaza <trebel@defiplaza.net>",
			"ReplyToAddresses": [params?.email]
		};

		const aws = new AwsClient({ accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY });
		const response = await aws.fetch('https://email.eu-central-1.amazonaws.com/v2/email/outbound-emails', { body: JSON.stringify(body) })

		return dfpResponse({
			status: response.status,
			text: response.statusText
		});
	}

	return plainResponse('empty');
}