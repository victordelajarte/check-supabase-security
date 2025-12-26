export const wait = (seconds: number) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

export const isSupabaseUrl = (url: string): boolean => {
  return url.includes("supabase.co") || url.includes("supabase.in");
};
