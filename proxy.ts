export { auth as proxy } from '@/auth';

export const config = {
  matcher: ['/protected/:path*', '/api/protected/:path*'],
};
