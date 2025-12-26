import { input } from "@inquirer/prompts";
import type { AuthInfo } from "./types.js";

export const getUrl = async (): Promise<string> => {
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

export async function getAuthFromPrompts(
  supabaseUrl: string,
): Promise<AuthInfo> {
  const supabaseRootUrl = new URL(supabaseUrl);
  supabaseRootUrl.pathname = "";
  supabaseRootUrl.search = "";

  const apiKey = await input({
    message:
      "Enter the Supabase public API key (it is visible in the website network and in your Supabase project settings): sb_publishable_...",
    validate: (value) => (value.trim() ? true : "API key is required"),
  });

  return {
    authorization: `Bearer ${apiKey}`,
    apiKey,
    url: supabaseRootUrl.toString(),
  };
}
