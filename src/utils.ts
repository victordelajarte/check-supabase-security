export const wait = (seconds: number) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

const isUrl = (value: string): boolean => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export class UrlWrapper {
  private readonly value: URL;

  constructor(value: string) {
    if (isUrl(value)) {
      this.value = new URL(value);
      return;
    }

    const prefixedUrl = `https://${value}`;
    if (isUrl(prefixedUrl)) {
      this.value = new URL(prefixedUrl);
      return;
    }

    throw new Error(`Invalid URL: ${value}`);
  }

  toString() {
    return this.value.toString();
  }

  isSupabaseUrl() {
    return (
      this.value.href.includes("supabase.co") ||
      this.value.href.includes("supabase.in")
    );
  }

  getRootUrl(): UrlWrapper {
    const rootUrl = new URL(this.value.toString());
    rootUrl.pathname = "";
    rootUrl.search = "";
    return new UrlWrapper(rootUrl.toString());
  }

  getStandardUrl(): URL {
    return new URL(this.value);
  }
}
