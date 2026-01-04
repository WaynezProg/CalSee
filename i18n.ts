/**
 * next-intl Configuration
 * Based on Spec 003 - Multi-item Recognition i18n Scaffold
 *
 * Simplified configuration for single locale (zh-TW).
 * No middleware needed since we only support one locale.
 */

import { getRequestConfig } from 'next-intl/server';

export const locales = ['zh-TW'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'zh-TW';

export default getRequestConfig(async () => {
  // Always use zh-TW for now (single locale support)
  const locale = defaultLocale;

  return {
    locale,
    messages: (await import(`./lib/i18n/messages/${locale}.json`)).default,
  };
});
