"use client";

import { Button, Input, TextField } from "@heroui/react";
import type { FormEvent } from "react";

/**
 * Footer email-capture UI — same "foundation only, not wired up yet"
 * pattern as SearchBar.tsx: a real form with a real input, but no
 * subscription backend exists yet, so submitting just prevents a full-page
 * reload rather than faking a success state.
 */
export function NewsletterSignup() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-lg flex-col gap-2 sm:flex-row">
      <TextField.Root type="email" isRequired aria-label="Email address" className="flex-1">
        <Input placeholder="your email address" className="h-11 rounded-full bg-ink-secondary px-4 text-small text-white placeholder:text-white/50" />
      </TextField.Root>
      <Button type="submit" variant="primary" className="h-11 shrink-0 rounded-full px-6">
        Subscribe
      </Button>
    </form>
  );
}
