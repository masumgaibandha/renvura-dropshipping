import type { Metadata } from "next";

import { Container } from "@/components/layout/Container";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create Account",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <Container>
      <div className="mx-auto max-w-md py-10">
        <h1 className="text-h1 text-center text-foreground">Create Account</h1>
        <p className="mt-2 text-center text-body text-foreground/70">Join Renvura to track orders and save your addresses.</p>
        <div className="mt-6">
          <SignupForm />
        </div>
      </div>
    </Container>
  );
}
