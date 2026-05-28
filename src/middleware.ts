import { withAuth } from 'next-auth/middleware';

// Force NextAuth's middleware to use our custom sign-in page instead of the
// built-in /api/auth/signin route. This ensures the redirect respects the
// current request origin and matches the in-page client checks in
// /checkout that already use /login?callbackUrl=...
export default withAuth({
    pages: {
        signIn: '/login',
    },
});

export const config = {
    matcher: ['/checkout', '/checkout-2'],
};
