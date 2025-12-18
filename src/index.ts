import { appendFile } from "node:fs/promises";
import { chromium } from "playwright";
import { z } from "zod/mini";

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

async function main(websiteUrl: string) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Get CDP session
  const client = await context.newCDPSession(page);

  // Enable network tracking
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

const getConfig = () => {
  const schema = z.object({
    WEBSITE_URL: z.url("Please provide a valid URL for WEBSITE_URL"),
  });
  return schema.parse(process.env);
};

const config = getConfig();
main(config.WEBSITE_URL);
