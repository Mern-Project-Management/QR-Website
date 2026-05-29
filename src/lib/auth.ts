import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getAdminOrigin } from "@/lib/adminOrigin";

const ADMIN_ORIGIN = getAdminOrigin();

// Extend NextAuth types to include accessToken
declare module "next-auth" {
  interface User {
    id?: string;
    accessToken?: string | null;
    role?: string;
  }
  interface Session {
    accessToken?: string | null;
    user?: {
      id?: string;
      role?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
  interface JWT {
    accessToken?: string | null;
    role?: string;
    id?: string;
  }
}

type BackendAuthUser = {
  id?: string | number;
  name?: string;
  email?: string;
  role?: string;
};

type BackendAuthResponse = {
  success?: boolean;
  message?: string;
  token?: string;
  accessToken?: string;
  jwt?: string;
  user?: BackendAuthUser;
  data?: {
    token?: string;
    accessToken?: string;
    jwt?: string;
    user?: BackendAuthUser;
  };
};

function getCookieDomain(): string | undefined {
  if (process.env.NODE_ENV !== "production") return undefined;
  
  if (process.env.COOKIE_DOMAIN) {
    return process.env.COOKIE_DOMAIN;
  }
  
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (nextAuthUrl) {
    try {
      const url = new URL(nextAuthUrl);
      const host = url.hostname;
      if (host === "localhost" || host === "127.0.0.1" || /^[0-9.]+$/.test(host)) {
        return undefined;
      }
      const parts = host.split(".");
      if (parts.length >= 2) {
        return `.${parts.slice(-2).join(".")}`;
      }
    } catch {
      // ignore
    }
  }
  
  return ".odokho.com";
}

export const authOptions: NextAuthOptions = {
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: getCookieDomain(),
      },
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email or Phone", type: "text" },
        otp: { label: "OTP", type: "text" },
        // Extra fields used by the app-side OTP verify -> NextAuth sign-in bridge.
        // Including them here avoids any provider-layer filtering in some setups.
        passthrough: { label: "Passthrough", type: "text" },
        accessToken: { label: "Access Token", type: "text" },
        user: { label: "User JSON", type: "text" },
        flow: { label: "Flow", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        // Allow a "passthrough" sign-in after the frontend already verified OTP
        // (avoids double-verification and lets UI show exact backend errors).
        const passRaw = (credentials as unknown as { passthrough?: unknown }).passthrough;
        const accessToken = (credentials as unknown as { accessToken?: unknown }).accessToken;
        const userJsonOrObj = (credentials as unknown as { user?: unknown }).user;

        const pass =
          passRaw === true ||
          passRaw === 1 ||
          passRaw === "1" ||
          passRaw === "true" ||
          // If these are present, treat the request as passthrough even if passthrough was dropped.
          (typeof accessToken === "string" && accessToken.length > 0) ||
          (typeof userJsonOrObj === "string" && userJsonOrObj.length > 0) ||
          (typeof userJsonOrObj === "object" && userJsonOrObj !== null);

        if (pass) {
          const parsedUser: BackendAuthUser | null = (() => {
            try {
              if (typeof userJsonOrObj === "string" && userJsonOrObj) {
                return JSON.parse(userJsonOrObj) as BackendAuthUser;
              }
              if (typeof userJsonOrObj === "object" && userJsonOrObj !== null) {
                return userJsonOrObj as BackendAuthUser;
              }
              return null;
            } catch {
              return null;
            }
          })();

          return {
            id: String(parsedUser?.id ?? parsedUser?.email ?? credentials.email),
            name: parsedUser?.name || "",
            email: parsedUser?.email || credentials.email,
            role: parsedUser?.role || "customer",
            accessToken: typeof accessToken === "string" && accessToken.length > 0 ? accessToken : null,
          };
        }

        if (!credentials?.otp) return null;

        try {
          const flow = (credentials as unknown as { flow?: string }).flow || "login";
          // Server calls admin API directly (ADMIN_ORIGIN). Do not use /api/backend/* — that prefix is only for browser → Next.js proxy.
          const endpoint =
            flow === "register"
              ? "/api/auth/register/verify-otp"
              : "/api/auth/login/verify-otp";

          const res = await fetch(`${ADMIN_ORIGIN}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              otp: credentials.otp,
            }),
          });

          const text = await res.text();
          const data: BackendAuthResponse | null = (() => {
            try {
              return JSON.parse(text) as BackendAuthResponse;
            } catch {
              return null;
            }
          })();

          if (!res.ok) return null;

          const user = data?.user || data?.data?.user;
          const token = data?.token || data?.accessToken || data?.jwt || data?.data?.token || data?.data?.accessToken || data?.data?.jwt;

          if (user) {
            return {
              id: String(user.id ?? user.email ?? credentials.email),
              name: user.name || "",
              email: user.email || credentials.email,
              role: user.role || "customer",
              accessToken: token || null,
            };
          }

          // If backend doesn't return user object, still allow session based on email.
          return {
            id: String(credentials.email),
            name: "",
            email: credentials.email,
            role: "customer",
            accessToken: token || null,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessToken = user.accessToken || null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string | undefined;
        session.user.role = token.role as string | undefined;
      }
      session.accessToken = (token.accessToken as string | null | undefined) || null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};