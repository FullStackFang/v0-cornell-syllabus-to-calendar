import type { NextAuthOptions } from "next-auth";
export declare const authOptions: NextAuthOptions;
declare module "next-auth" {
    interface Session {
        accessToken?: string;
        error?: string;
    }
}
declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: number;
        error?: string;
    }
}
//# sourceMappingURL=auth.d.ts.map