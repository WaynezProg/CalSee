import SignInButton from "@/app/components/auth/SignInButton";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-6 py-16">
      <div className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sign in</h1>
          <p className="mt-2 text-sm text-gray-500">
            Sign in with your Google account to continue.
          </p>
        </div>
        <SignInButton />
      </div>
    </div>
  );
}
