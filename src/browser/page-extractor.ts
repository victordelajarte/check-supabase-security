import type { Page } from "playwright";

export interface PageContent {
  htmlContent: string;
  scriptUrls: string[];
  scriptContents: string[];
}

export async function extractPageContent(page: Page): Promise<PageContent> {
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

  return pageData;
}

export async function fetchExternalScripts(
  page: Page,
  scriptUrls: string[],
): Promise<string[]> {
  const scriptContents: string[] = [];

  for (const scriptUrl of scriptUrls) {
    try {
      const response = await page.goto(scriptUrl);
      if (response?.ok()) {
        const scriptText = await response.text();
        scriptContents.push(scriptText);
      } else {
        console.error(`Failed to fetch script at ${scriptUrl}, skipping...`);
      }
    } catch (error) {
      console.error(`Error fetching script at ${scriptUrl}, skipping...`);
    }
  }

  return scriptContents;
}

export async function extractAuthLinks(page: Page): Promise<string[]> {
  const authKeywords = [
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
      authKeywords.some(
        (keyword) =>
          link.href.toLowerCase().includes(keyword) ||
          link.text.includes(keyword),
      ),
    )
    .map((link) => link.href);

  return [...new Set(authLinks)];
}
