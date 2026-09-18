/**
 * Embedded in-app browsers (the webview an app opens a link in). Google refuses
 * OAuth inside them (`disallowed_useragent`), and the failure happens on
 * Google's own page, so we can't catch it — the sign-up gate swaps the Google
 * button for "Open in your browser" when this matches. A heuristic by nature:
 * a miss just means the reader sees the normal Google button.
 */
const APP_TOKENS =
  /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Twitter|LinkedInApp|Line\/|MicroMessenger|Snapchat|Pinterest|TelegramBot|; wv\)/i;

export function isInAppBrowser(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  if (APP_TOKENS.test(userAgent)) return true;
  // iOS WKWebView: WebKit on an iPhone/iPad with no "Safari/" token. Real
  // Safari, and Chrome/Firefox/Edge on iOS (CriOS/FxiOS/EdgiOS), all carry it.
  const isIos = /iPhone|iPad|iPod/.test(userAgent);
  return isIos && /AppleWebKit/.test(userAgent) && !/Safari\//.test(userAgent);
}
