import { UrlWrapper } from "../utils.js";
import { checkTablePublicAccess } from "../check-table-access.js";
import { getAuthFromBrowser } from "../browser/index.js";
import { getAuthFromPrompts } from "../prompts.js";
import type { AuthInfo } from "../types.js";

async function getAuthInfos(url: UrlWrapper, onProgress?: (msg: string) => void): Promise<AuthInfo> {
  if (url.isSupabaseUrl()) {
    onProgress?.("Getting Supabase credentials...");
    return getAuthFromPrompts(url);
  }

  onProgress?.("Launching browser to extract credentials...");
  return getAuthFromBrowser(url);
}

export async function checkSupabaseSecurity(
  url: UrlWrapper,
  onProgress?: (msg: string) => void
): Promise<{ openTables: string[]; closedTables: string[] }> {
  onProgress?.("Validating URL...");

  const authInfos = await getAuthInfos(url, onProgress);

  onProgress?.("Checking table access permissions...");
  const { openTables, closedTables } = await checkTablePublicAccess(authInfos);

  return { openTables, closedTables };
}
