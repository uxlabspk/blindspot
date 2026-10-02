import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { sendMail } from "./email";

const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }) => {
      void sendMail({
        to: user.email,
        subject: "Reset your Blindspot password",
        text: `Reset your password:\n${base}/reset-password?token=${token}\n\nIf you didn't request this, you can ignore this email.`,
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, token }) => {
      void sendMail({
        to: user.email,
        subject: "Verify your Blindspot email",
        text: `Verify your email address:\n${base}/verify-email?token=${token}\n\nThis link expires shortly.`,
      });
    },
  },
});
