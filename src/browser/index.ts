import type { AuthInfo } from "../types.js";
import { launchBrowser, closeBrowser } from "./lifecycle.js";
import { setupNetworkInterceptor } from "./network-interceptor.js";
import {
  trySourceCodeExtraction,
  tryAuthLinksStrategy,
  tryCommonPathsStrategy,
} from "./strategies.js";
import { UrlWrapper, wait } from "../utils.js";
import { DELAY } from "./constants.js";

export { setupSignalHandlers } from "./lifecycle.js";

export async function getAuthFromBrowser(
  websiteUrl: UrlWrapper,
): Promise<AuthInfo> {
  const browser = await launchBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  const authInfos: AuthInfo = {
    authorization: "",
    apiKey: "",
    url: websiteUrl,
  };

  const client = await context.newCDPSession(page);
  await setupNetworkInterceptor(client, authInfos);

  try {
    await page.goto(websiteUrl.toString(), {
      waitUntil: "networkidle",
      timeout: DELAY * 1000,
    });
    await wait(DELAY);
  } catch (error) {
    console.error(`Failed to load ${websiteUrl.toString()}, continuing...`);
  }

  if (!authInfos.authorization || !authInfos.apiKey) {
    const foundInSource = await trySourceCodeExtraction(page, authInfos);

    if (!foundInSource) {
      const foundInAuthLinks = await tryAuthLinksStrategy(page, authInfos);

      if (!foundInAuthLinks) {
        await tryCommonPathsStrategy(page, websiteUrl, authInfos);
      }
    }
  }

  await page.close();
  await closeBrowser();

  if (!authInfos.authorization || !authInfos.apiKey) {
    console.error(
      "No Supabase request detected on any page. Do you have the URL and API key?",
    );
    process.exit(0);
  }

  return authInfos;
}
