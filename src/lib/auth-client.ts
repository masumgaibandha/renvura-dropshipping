"use client";

import { emailOTPClient, inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "./auth";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), emailOTPClient()],
});

export const { signIn, signUp, signOut, useSession, updateUser } = authClient;
// authClient.emailOtp.{sendVerificationOtp, verifyEmail, requestPasswordReset, resetPassword}
export const emailOtp = authClient.emailOtp;
