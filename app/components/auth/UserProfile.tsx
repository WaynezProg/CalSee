'use client';

import { useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import ErrorMessage from '@/app/components/ui/ErrorMessage';
import SignOutButton from '@/app/components/auth/SignOutButton';

export default function UserProfile() {
  const { data: session, status } = useSession();
  const [imageError, setImageError] = useState(false);

  // Track if user was ever authenticated using a lazy initializer
  // The initializer only runs once, then useState preserves the value
  const [hadSession, setHadSession] = useState(false);

  // Derive new hadSession value - only update when transitioning to authenticated
  // This avoids the ESLint set-state-in-effect error by computing the value
  // and only calling setState when absolutely necessary (guarded by condition)
  if (status === 'authenticated' && !hadSession) {
    // This is intentional: updating state during render when we detect
    // a transition to authenticated. React handles this case specifically.
    setHadSession(true);
  }

  // Reset image error when image URL changes - use key-based approach instead
  const imageKey = session?.user?.image ?? 'no-image';

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  if (status === 'loading') {
    return <div className="text-xs text-gray-500">Loading session...</div>;
  }

  if (status === 'unauthenticated') {
    if (hadSession) {
      return <ErrorMessage errorType="session_expired" />;
    }

    return null;
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      {session.user.image && !imageError ? (
        <Image
          key={imageKey}
          src={session.user.image}
          alt={session.user.name ?? 'User'}
          width={32}
          height={32}
          className="h-8 w-8 rounded-full border border-gray-200 object-cover"
          referrerPolicy="no-referrer"
          onError={handleImageError}
          unoptimized
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600">
          {session.user.name?.[0] ?? 'U'}
        </div>
      )}
      <div className="flex flex-col text-xs text-gray-600">
        <span className="font-medium text-gray-800">{session.user.name ?? 'Signed in'}</span>
        <span>{session.user.email}</span>
      </div>
      <SignOutButton />
    </div>
  );
}
