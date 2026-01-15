'use client';

/**
 * AppLogo Component
 *
 * Displays the CalSee logo using download.svg
 */

import Image from 'next/image';

export default function AppLogo() {
  return (
    <div className="flex items-center">
      {/* Logo: Use download.svg */}
      <Image
        src="/logo.svg"
        alt="CalSee - 飲食記錄"
        width={160}
        height={40}
        className="h-10 w-auto object-contain"
        priority
      />
    </div>
  );
}
