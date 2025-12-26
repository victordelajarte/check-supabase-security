import { chromium, type Browser } from "playwright";

let browserInstance: Browser | null = null;

export async function launchBrowser(): Promise<Browser> {
  browserInstance = await chromium.launch({ headless: false });
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

export async function cleanup(): Promise<void> {
  if (browserInstance) {
    await closeBrowser();
  }
}

export function setupSignalHandlers(): void {
  process.on("SIGINT", async () => {
    await cleanup();
    process.exit(130);
  });

  process.on("SIGTERM", async () => {
    await cleanup();
    process.exit(143);
  });
}
