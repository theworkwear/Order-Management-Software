import NextAuth, { type AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

if (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.trim() === '') {
  process.env.NEXTAUTH_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
}

export const authOptions: AuthOptions = {
  providers: [
    // Simple email/password login from .env
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@theworkwear.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        const digitizerEmail = process.env.DIGITIZER_EMAIL || 'digitizer@theworkwear.com';
        const digitizerPassword = process.env.DIGITIZER_PASSWORD || 'digitizer123';

        if (
          credentials.email === adminEmail &&
          credentials.password === adminPassword
        ) {
          return {
            id: '1',
            email: adminEmail,
            name: 'Owner (Admin)',
            role: 'admin',
          } as any;
        }

        if (
          credentials.email === digitizerEmail &&
          credentials.password === digitizerPassword
        ) {
          return {
            id: '2',
            email: digitizerEmail,
            name: 'Digitizer',
            role: 'digitizer',
          } as any;
        }

        return null;
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly',
                access_type: 'offline',
                prompt: 'consent',
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Persist user role in JWT
      if (user) {
        token.role = (user as any).role || 'admin';
      }
      // Persist Google tokens in JWT
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      // Make tokens & role available in session
      (session as any).accessToken = token.accessToken;
      (session as any).provider = token.provider;
      (session as any).role = token.role || 'admin';
      if (session.user) {
        (session.user as any).role = token.role || 'admin';
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
