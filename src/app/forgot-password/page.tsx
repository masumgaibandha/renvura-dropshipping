import type { Metadata } from "next";

import { Container } from "@/components/layout/Container";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <Container>
      <div className="mx-auto max-w-md py-10">
        <h1 className="text-h1 text-center text-foreground">Forgot Password</h1>
        <p className="mt-2 text-center text-body text-foreground/70">Enter your email and we&apos;ll send you a code to reset your password.</p>
        <div className="mt-6">
          <ForgotPasswordForm />
        </div>
      </div>
    </Container>
  );
}
