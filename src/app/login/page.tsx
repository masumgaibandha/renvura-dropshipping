import type { Metadata } from "next";

import { Container } from "@/components/layout/Container";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Container>
      <div className="mx-auto max-w-md py-10">
        <h1 className="text-h1 text-center text-foreground">Sign In</h1>
        <p className="mt-2 text-center text-body text-foreground/70">Welcome back to Renvura.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </Container>
  );
}
