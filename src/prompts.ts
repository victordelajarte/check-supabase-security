import { input } from "@inquirer/prompts";
import type { AuthInfo } from "./types.js";
import { UrlWrapper } from "./utils.js";

export const getUrl = async (): Promise<UrlWrapper> => {
  const url = await input({
    message: "Enter URL (website or Supabase URL):",
    validate: (value) => {
      try {
        new UrlWrapper(value);
        return true;
      } catch {
        return "Please enter a valid URL";
      }
    },
  });

  return new UrlWrapper(url);
};

export async function getAuthFromPrompts(
  supabaseUrl: UrlWrapper,
): Promise<AuthInfo> {
  const supabaseRootUrl = supabaseUrl.getRootUrl();

  const apiKey = await input({
    message:
      "Enter the Supabase public API key (it is visible in the website network and in your Supabase project settings): sb_publishable_...",
    required: true,
  });

  return {
    authorization: `Bearer ${apiKey}`,
    apiKey,
    url: supabaseRootUrl,
  };
}
