import type { Metadata } from "next";

import { Container } from "@/components/layout/Container";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Container>
      <div className="mx-auto max-w-md py-10">
        <h1 className="text-h1 text-center text-foreground">Reset Password</h1>
        <p className="mt-2 text-center text-body text-foreground/70">Enter the code we sent you and choose a new password.</p>
        <div className="mt-6">
          <ResetPasswordForm />
        </div>
      </div>
    </Container>
  );
}
