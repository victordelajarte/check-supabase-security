import type { Page } from "playwright";
import type { AuthInfo } from "../types.js";
import { UrlWrapper, wait } from "../utils.js";
import {
  extractPageContent,
  fetchExternalScripts,
  extractAuthLinks,
} from "./page-extractor.js";
import { findSupabaseCredentials } from "./credential-finder.js";
import { DELAY } from "./constants.js";

async function checkPage(page: Page, url: string): Promise<void> {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: DELAY * 1000 });
    await wait(DELAY);
  } catch (error) {
    console.error(`Failed to load ${url}, skipping...`);
  }
}

export async function trySourceCodeExtraction(
  page: Page,
  authInfos: AuthInfo,
): Promise<boolean> {
  const pageData = await extractPageContent(page);
  const externalScripts = await fetchExternalScripts(page, pageData.scriptUrls);
  const allContent = [
    pageData.htmlContent,
    ...pageData.scriptContents,
    ...externalScripts,
  ].join("\n");

  const credentials = findSupabaseCredentials(allContent);

  if (credentials) {
    authInfos.url = new UrlWrapper(credentials.url);
    authInfos.apiKey = credentials.apiKey;
    authInfos.authorization = `Bearer ${credentials.apiKey}`;
    return true;
  }

  return false;
}

export async function tryAuthLinksStrategy(
  page: Page,
  authInfos: AuthInfo,
): Promise<boolean> {
  const authLinks = await extractAuthLinks(page);

  if (authLinks.length > 0) {
    for (const link of authLinks) {
      if (authInfos.authorization && authInfos.apiKey) return true;
      await checkPage(page, link);
    }
  }

  return authInfos.authorization !== "" && authInfos.apiKey !== "";
}

export async function tryCommonPathsStrategy(
  page: Page,
  websiteUrl: UrlWrapper,
  authInfos: AuthInfo,
): Promise<boolean> {
  const commonAuthPaths = [
    "/login",
    "/register",
    "/signup",
    "/sign-in",
    "/auth",
  ];

  for (const path of commonAuthPaths) {
    if (authInfos.authorization && authInfos.apiKey) return true;

    const testUrl = new URL(path, websiteUrl.getStandardUrl().origin);
    await checkPage(page, testUrl.toString());
  }

  return authInfos.authorization !== "" && authInfos.apiKey !== "";
}
