import { appendFile } from "node:fs/promises";
import { chromium } from "playwright";
import { input } from "@inquirer/prompts";

const wait = (seconds: number) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

const testFetchData = async ({
  url,
  authorization,
  apiKey,
}: {
  url: string;
  authorization: string;
  apiKey: string;
}) => {
  const response = await fetch(url, {
    headers: {
      Authorization: authorization,
      apikey: apiKey,
    },
  });

  if (!response.ok) {
    const responseText = await response.text();
    const error = responseText.includes("does not exist")
      ? `Table does not exist`
      : responseText;
    return { error };
  }

  const data = await response.json();
  return { data };
};

async function testAuthInfos(authInfos: {
  authorization: string;
  apiKey: string;
  url: string;
}) {
  const url = new URL(authInfos.url);

  const tables = [
    "users",
    "user",
    "auth_users",
    "auth_user",
    "profiles",
    "profile",
    "user_profiles",
    "user_profile",
    "accounts",
    "account",
    "files",
    "file",
    "documents",
    "document",
    "images",
    "image",
  ];
  for (const tableName of tables) {
    const tableUrl = new URL(`/rest/v1/${tableName}`, url.origin);
    tableUrl.searchParams.set("limit", "1");

    const response = await testFetchData({
      url: tableUrl.toString(),
      authorization: authInfos.authorization,
      apiKey: authInfos.apiKey,
    });

    if (response.error) {
      console.log("Error on table ", tableName, ": ", response.error);
      continue;
    }

    if (response.data.length) {
      console.log(`✅ Table "${tableName}" is OPEN: `, response.data[0]);
      await appendFile("open_tables.txt", tableName + "\n");
    } else {
      console.log(`❌ Table "${tableName}" is CLOSED`);
      await appendFile("closed_tables.txt", tableName + "\n");
    }
  }
}

const isSupabaseUrl = (url: string): boolean => {
  return url.includes("supabase.co") || url.includes("supabase.in");
};

async function getAuthFromBrowser(websiteUrl: string) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const client = await context.newCDPSession(page);
  await client.send("Network.enable");

  const authInfos = {
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

  await page.goto(websiteUrl);

  const DELAY = 5;
  await wait(DELAY);

  await page.close();
  await browser.close();

  if (!authInfos.authorization || !authInfos.apiKey) {
    console.log(
      "No Supabase request detected, you may need to test another page.",
    );
    process.exit(0);
  }

  return authInfos;
}

async function getAuthFromPrompts(supabaseUrl: string) {
  const apiKey = await input({
    message:
      "Enter the Supabase public API key (it is visible in the website network and in your Supabase project settings): sb_publishable_...",
    validate: (value) => (value.trim() ? true : "API key is required"),
  });

  return {
    authorization: `Bearer ${apiKey}`,
    apiKey,
    url: supabaseUrl,
  };
}

async function main(url: string) {
  let authInfos;

  if (isSupabaseUrl(url)) {
    console.log("Supabase URL detected. Testing tables directly...");
    authInfos = await getAuthFromPrompts(url);
  } else {
    console.log(
      "Website URL detected. Opening browser to intercept Supabase requests...",
    );
    authInfos = await getAuthFromBrowser(url);
  }

  await testAuthInfos(authInfos);

  console.log(`Done, you can check open_tables.txt and closed_tables.txt files.

This script only tests public SELECT permissions.

In the open_tables.txt file, you have the list of tables that are publicly accessible.
In the closed_tables.txt file, you have the list of tables that are not publicly accessible for select.

🚨🚨🚨
It does not mean there is no vulnerability on these tables !
You need to make sure that, as an authenticated user, you can only see what is yours
Furthermore, if some tables are closed for select, they may still be vulnerable to INSERT/UPDATE/DELETE attacks.
🚨🚨🚨`);

  process.exit(0);
}

const getUrl = async (): Promise<string> => {
  const url = await input({
    message: "Enter URL (website or Supabase URL):",
    validate: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return "Please provide a valid URL";
      }
    },
  });
  return url;
};

getUrl().then(main);
