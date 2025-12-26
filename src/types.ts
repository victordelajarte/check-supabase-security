import { UrlWrapper } from "./utils";

export interface AuthInfo {
  authorization: string;
  apiKey: string;
  url: UrlWrapper;
}
