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
): Promise<void> {
  console.log(`Trying ${url}...`);
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: DELAY * 1000 });
    await wait(DELAY);
  } catch (error) {
    console.log(`Failed to load ${url}, skipping...`);
  }
}

async function extractAuthLinks(page: Page): Promise<string[]> {
  const AUTH_KEYWORDS = [
    "login",
    "register",
    "signup",
    "sign-up",
    "sign-in",
    "signin",
    "auth",
  ];

  const links = await page.evaluate(() => {
    return [...document.querySelectorAll("a[href]")].map((a) => ({
      href: (a as HTMLAnchorElement).href,
      text: (a as HTMLAnchorElement).textContent?.toLowerCase() ?? "",
    }));
  });

  const authLinks = links
    .filter((link) =>
      AUTH_KEYWORDS.some(
        (keyword) =>
          link.href.toLowerCase().includes(keyword) ||
          link.text.includes(keyword),
      ),
    )
    .map((link) => link.href);

  return [...new Set(authLinks)];
}

async function extractSupabaseConfigFromSource(
  page: Page,
): Promise<{ url: string; apiKey: string } | null> {
  const pageData = await page.evaluate(() => {
    const htmlContent = document.documentElement.outerHTML;
    const scriptElements = [...document.querySelectorAll("script")];
    const scriptUrls = scriptElements.map((s) => s.src).filter(Boolean);
    const scriptContents = scriptElements
      .filter((s) => !s.src)
      .map((s) => s.textContent ?? "");

    return {
      htmlContent,
      scriptUrls,
      scriptContents,
    };
  });

  for (const scriptUrl of pageData.scriptUrls) {
    const response = await page.goto(scriptUrl);
    if (response && response.ok()) {
      const scriptText = await response.text();
      pageData.scriptContents.push(scriptText);
    }

    if (!response || !response.ok()) {
      console.log(`🚨 Failed to fetch script at ${scriptUrl}, skipping...`);
    }
  }

  const allContent = [pageData.htmlContent, ...pageData.scriptContents].join(
    "\n",
  );

  const supabaseUrlMatch = allContent.match(
    /https?:\/\/[a-zA-Z0-9-]+\.supabase\.(co|in)[^\s"'`]*/,
  );

  const apiKeyMatch =
    allContent.match(/sb_publishable_[a-zA-Z0-9_-]+/) ||
    allContent.match(
      /eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/,
    );

  if (supabaseUrlMatch && apiKeyMatch) {
    return {
      url: supabaseUrlMatch[0],
      apiKey: apiKeyMatch[0],
    };
  }

  return null;
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
    console.log("No Supabase request found. Scanning page source code...");
    const sourceConfig = await extractSupabaseConfigFromSource(page);

    if (sourceConfig) {
      console.log("Found Supabase config in source code!");
      console.log(sourceConfig);
      authInfos.url = sourceConfig.url;
      authInfos.apiKey = sourceConfig.apiKey;
      authInfos.authorization = `Bearer ${sourceConfig.apiKey}`;
    } else {
      console.log("No config in source. Extracting auth links from page...");
      const authLinks = await extractAuthLinks(page);

      if (authLinks.length > 0) {
        console.log(
          `Found ${authLinks.length} potential auth link(s), trying them...`,
        );
        for (const link of authLinks) {
          if (authInfos.authorization && authInfos.apiKey) break;
          await checkPageForSupabaseRequests(page, link);
        }
      }

      if (!authInfos.authorization || !authInfos.apiKey) {
        console.log("No Supabase request found. Trying common auth paths...");
        const baseUrl = new URL(websiteUrl);

        for (const path of COMMON_PATHS) {
          if (authInfos.authorization && authInfos.apiKey) break;

          const testUrl = new URL(path, baseUrl.origin);
          await checkPageForSupabaseRequests(page, testUrl.toString());
        }
      }
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
