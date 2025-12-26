import { chromium, type Browser, type Page } from "playwright";
import { wait } from "./utils.js";
import type { AuthInfo } from "./types.js";

let browserInstance: Browser | null = null;
const DELAY = 5;

const cleanup = async () => {
  if (browserInstance) {
    console.log("\nClosing browser...");
    await browserInstance.close();
    browserInstance = null;
  }
};

export function setupSignalHandlers() {
  process.on("SIGINT", async () => {
    console.log("\nInterrupted. Cleaning up...");
    await cleanup();
    process.exit(130);
  });

  process.on("SIGTERM", async () => {
    console.log("\nTerminated. Cleaning up...");
    await cleanup();
    process.exit(143);
  });
}

async function checkPageForSupabaseRequests(
  page: Page,
  url: string,
  options?: { waitUntil?: "networkidle"; timeout?: number },
): Promise<void> {
  console.log(`Trying ${url}...`);
  try {
    await page.goto(url, options);
    await wait(DELAY * 1000);
  } catch (error) {
    console.log(`Failed to load ${url}, skipping...`);
  }
}

export async function getAuthFromBrowser(
  websiteUrl: string,
): Promise<AuthInfo> {
  const COMMON_PATHS = ["/login", "/register", "/signup", "/sign-in", "/auth"];

  browserInstance = await chromium.launch({ headless: false });
  const context = await browserInstance.newContext();
  const page = await context.newPage();

  const client = await context.newCDPSession(page);
  await client.send("Network.enable");

  const authInfos: AuthInfo = {
    authorization: "",
    apiKey: "",
    url: "",
  };

  client.on("Network.requestWillBeSent", (params) => {
    if (!params.request.url.includes("supabase")) return;

    const headers = params.request.headers;
    const authorization = headers["Authorization"] || headers["authorization"];
    const apiKey = headers["apikey"] || headers["x-api-key"];

    if (!authorization || !apiKey) return;

    authInfos.authorization = authorization;
    authInfos.apiKey = apiKey;
    authInfos.url = params.request.url;
  });

  console.log("Checking for Supabase requests...");
  await checkPageForSupabaseRequests(page, websiteUrl);

  if (!authInfos.authorization || !authInfos.apiKey) {
    console.log("No Supabase request found. Trying common auth pages...");
    const baseUrl = new URL(websiteUrl);

    for (const path of COMMON_PATHS) {
      if (authInfos.authorization && authInfos.apiKey) break;

      const testUrl = new URL(path, baseUrl.origin);
      await checkPageForSupabaseRequests(page, testUrl.toString(), {
        waitUntil: "networkidle",
        timeout: 10000,
      });
    }
  }

  await page.close();
  await browserInstance.close();
  browserInstance = null;

  if (!authInfos.authorization || !authInfos.apiKey) {
    console.log(
      "No Supabase request detected on any page. You may need to manually interact with the website.",
    );
    process.exit(0);
  }

  console.log("Supabase credentials found!");
  return authInfos;
}
