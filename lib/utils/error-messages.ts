import type { AuthErrorType } from "@/types/auth";

export const AUTH_ERROR_MESSAGES: Record<AuthErrorType, string> = {
  network: "無法連線。請檢查網路連線後重試。",
  service_unavailable: "Google 認證服務暫時無法使用。請稍後再試。",
  permissions_denied: "需要 Google 帳號權限才能登入。請允許權限後重試。",
  session_expired: "登入已過期。請重新登入。",
  rate_limit_exceeded: "登入嘗試過於頻繁。請稍後再試。",
  invalid_session: "無效的登入狀態。請重新登入。",
  cookies_disabled: "需要啟用 Cookie 才能登入。請在瀏覽器設定中啟用 Cookie。",
  default: "登入失敗。請重試。",
};

export function getAuthErrorMessage(errorType: AuthErrorType | string): string {
  if (errorType in AUTH_ERROR_MESSAGES) {
    return AUTH_ERROR_MESSAGES[errorType as AuthErrorType];
  }

  return AUTH_ERROR_MESSAGES.default;
}
