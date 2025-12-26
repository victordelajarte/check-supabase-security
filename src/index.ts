import { isSupabaseUrl } from "./utils.js";
import { checkTablePublicAccess } from "./check-table-access.js";
import { getAuthFromBrowser, setupSignalHandlers } from "./browser";
import { getUrl, getAuthFromPrompts } from "./prompts.js";
import { writeFile } from "node:fs/promises";

setupSignalHandlers();

function getAuthInfos(url: string) {
  if (isSupabaseUrl(url)) {
    return getAuthFromPrompts(url);
  }

  return getAuthFromBrowser(url);
}

async function main(url: string) {
  const authInfos = await getAuthInfos(url);

  const { openTables, closedTables } = await checkTablePublicAccess(authInfos);

  await writeFile("open_tables.txt", openTables.join("\n"));
  await writeFile("closed_tables.txt", closedTables.join("\n"));

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

getUrl().then(main);
