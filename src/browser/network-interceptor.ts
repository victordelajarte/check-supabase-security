import type { CDPSession } from "playwright";
import type { AuthInfo } from "../types.js";
import { UrlWrapper } from "../utils.js";

export async function setupNetworkInterceptor(
  client: CDPSession,
  authInfos: AuthInfo,
): Promise<void> {
  await client.send("Network.enable");

  client.on("Network.requestWillBeSent", (params) => {
    if (!params.request.url.includes("supabase")) return;

    const headers = params.request.headers;
    const authorization = headers["Authorization"] || headers["authorization"];
    const apiKey = headers["apikey"] || headers["x-api-key"];

    if (!authorization || !apiKey) return;

    authInfos.authorization = authorization;
    authInfos.apiKey = apiKey;
    authInfos.url = new UrlWrapper(params.request.url);
  });
}
