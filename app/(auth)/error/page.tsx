import ErrorMessage from "@/app/components/ui/ErrorMessage";
import type { AuthErrorType } from "@/types/auth";

function mapNextAuthError(error?: string): AuthErrorType {
  switch (error) {
    case "AccessDenied":
      return "permissions_denied";
    case "Configuration":
    case "OAuthSignin":
    case "OAuthCallback":
    case "OAuthCreateAccount":
    case "OAuthAccountNotLinked":
    case "OAuthProfile":
      return "service_unavailable";
    case "Verification":
      return "invalid_session";
    case "rate_limit_exceeded":
      return "rate_limit_exceeded";
    default:
      return "default";
  }
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorType = mapNextAuthError(resolvedSearchParams?.error);

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-16">
      <div className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Authentication Error
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            We ran into an issue while trying to sign you in.
          </p>
        </div>
        <ErrorMessage errorType={errorType} />
        <a
          href="/"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Return to home
        </a>
      </div>
    </div>
  );
}
