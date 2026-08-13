import type { Metadata } from "next";

import { Container } from "@/components/layout/Container";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

export const metadata: Metadata = {
  title: "Verify Email",
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return (
    <Container>
      <div className="mx-auto max-w-md py-10">
        <h1 className="text-h1 text-center text-foreground">Verify Your Email</h1>
        <p className="mt-2 text-center text-body text-foreground/70">One more step to activate your Renvura account.</p>
        <div className="mt-6">
          <VerifyEmailForm />
        </div>
      </div>
    </Container>
  );
}
