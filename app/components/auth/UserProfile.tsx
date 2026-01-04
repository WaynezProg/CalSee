"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ErrorMessage from "@/app/components/ui/ErrorMessage";
import SignOutButton from "@/app/components/auth/SignOutButton";

export default function UserProfile() {
  const { data: session, status } = useSession();
  const [hadSession, setHadSession] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      setHadSession(true);
    }
  }, [status]);

  useEffect(() => {
    setImageError(false);
  }, [session?.user?.image]);

  if (status === "loading") {
    return <div className="text-xs text-gray-500">Loading session...</div>;
  }

  if (status === "unauthenticated") {
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
        <img
          src={session.user.image}
          alt={session.user.name ?? "User"}
          className="h-8 w-8 rounded-full border border-gray-200 object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600">
          {session.user.name?.[0] ?? "U"}
        </div>
      )}
      <div className="flex flex-col text-xs text-gray-600">
        <span className="font-medium text-gray-800">
          {session.user.name ?? "Signed in"}
        </span>
        <span>{session.user.email}</span>
      </div>
      <SignOutButton />
    </div>
  );
}
