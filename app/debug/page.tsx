'use client';

import { useSession } from 'next-auth/react';

export default function DebugPage() {
  const { data: session, status } = useSession();

  return (
    <div className="p-4 font-mono text-sm">
      <h1 className="text-lg font-bold mb-4">Session Debug</h1>
      <p><strong>Status:</strong> {status}</p>
      <p><strong>User ID:</strong> {session?.user?.id ?? 'N/A'}</p>
      <p><strong>Provider ID:</strong> {(session?.user as any)?.providerId ?? 'N/A'}</p>
      <p><strong>Email:</strong> {session?.user?.email ?? 'N/A'}</p>
      <p><strong>Name:</strong> {session?.user?.name ?? 'N/A'}</p>
      <hr className="my-4" />
      <pre className="bg-gray-100 p-2 rounded overflow-auto text-xs">
        {JSON.stringify(session, null, 2)}
      </pre>
    </div>
  );
}
