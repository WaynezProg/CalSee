import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  allowedDevOrigins: ['http://localhost:3000', 'http://192.168.68.37:3000'],
};

export default withNextIntl(nextConfig);
