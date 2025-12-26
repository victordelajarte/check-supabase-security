const SUPABASE_URL_REGEX =
  /https?:\/\/[a-zA-Z0-9-]+\.supabase\.(co|in)[^\s"'`]*/;

const SUPABASE_API_KEY_REGEX = /sb_publishable_[a-zA-Z0-9_-]+/;

const JWT_API_KEY_REGEX =
  /eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/;

interface SupabaseCredentials {
  url: string;
  apiKey: string;
}

export function findSupabaseCredentials(
  content: string,
): SupabaseCredentials | null {
  const supabaseUrlMatch = content.match(SUPABASE_URL_REGEX);
  const apiKeyMatch =
    content.match(SUPABASE_API_KEY_REGEX) || content.match(JWT_API_KEY_REGEX);

  if (supabaseUrlMatch && apiKeyMatch) {
    return {
      url: supabaseUrlMatch[0],
      apiKey: apiKeyMatch[0],
    };
  }

  return null;
}
