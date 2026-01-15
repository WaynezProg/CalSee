'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import ErrorMessage from '@/app/components/ui/ErrorMessage';
import type { AuthErrorType } from '@/types/auth';

function mapSignInError(error: string | null | undefined): AuthErrorType {
  switch (error) {
    case 'AccessDenied':
      return 'permissions_denied';
    case 'Configuration':
    case 'OAuthSignin':
    case 'OAuthCallback':
    case 'OAuthCreateAccount':
    case 'OAuthAccountNotLinked':
    case 'OAuthProfile':
      return 'service_unavailable';
    default:
      return 'default';
  }
}

export default function SignInButton() {
  const [errorType, setErrorType] = useState<AuthErrorType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setErrorType(null);
    setIsLoading(true);

    try {
      const result = await signIn('google', {
        redirect: false,
        callbackUrl: '/',
      });

      if (result?.error) {
        setErrorType(mapSignInError(result.error));
        return;
      }

      if (result?.url) {
        window.location.href = result.url;
        return;
      }

      setErrorType('service_unavailable');
    } catch (error) {
      console.error('Google sign-in failed', error);
      setErrorType('network');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isLoading}
        aria-busy={isLoading}
        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
      >
        {isLoading ? 'Signing in...' : 'Sign in with Google'}
      </button>
      <ErrorMessage errorType={errorType} />
    </div>
  );
}
