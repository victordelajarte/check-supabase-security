import { appendFile } from "node:fs/promises";
import type { AuthInfo } from "./types.js";

const tryFetchData = async ({
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

export async function checkTablePublicAccess(authInfos: AuthInfo) {
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

    const response = await tryFetchData({
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
