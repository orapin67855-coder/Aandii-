/** เบราว์เซอร์ในแอปที่ Google ไม่ให้ทำ OAuth */
export function detectInApp(ua: string): string | null {
  if (/\bLine\//i.test(ua)) return "LINE";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return "TikTok";
  if (/MicroMessenger/i.test(ua)) return "WeChat";
  return null;
}
