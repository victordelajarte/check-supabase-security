import { isSupabaseUrl } from "./utils.js";
import { checkTablePublicAccess } from "./check-table-access.js";
import { getAuthFromBrowser, setupSignalHandlers } from "./browser.js";
import { getUrl, getAuthFromPrompts } from "./prompts.js";

setupSignalHandlers();

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

  await checkTablePublicAccess(authInfos);

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
