'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';

export default function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut({ callbackUrl: '/' });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-700 disabled:cursor-not-allowed"
    >
      {isSigningOut ? 'Signing out...' : 'Sign out'}
    </button>
  );
}
