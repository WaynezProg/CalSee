"use client";

import { getAuthErrorMessage } from "@/lib/utils/error-messages";
import type { AuthErrorType } from "@/types/auth";

interface ErrorMessageProps {
  errorType?: AuthErrorType | string | null;
  message?: string | null;
  className?: string;
}

export default function ErrorMessage({
  errorType,
  message,
  className,
}: ErrorMessageProps) {
  if (!message && !errorType) {
    return null;
  }

  const displayMessage = message ?? getAuthErrorMessage(errorType ?? "default");

  return (
    <div
      className={[
        "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {displayMessage}
    </div>
  );
}
