import Link from "next/link";

import { brand } from "@/config/brand";

/**
 * Temporary placeholder — the real homepage is Phase 4. This intentionally
 * renders no <main> of its own; StoreShell (src/app/layout.tsx) already
 * supplies the page's <main> landmark.
 */
export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="text-label text-foreground/70 uppercase">Foundation build in progress</p>
      <h1 className="text-h1 max-w-2xl text-foreground">{brand.description}</h1>
      <p className="text-body max-w-md text-foreground/70">
        The homepage itself is Phase 4. In the meantime,{" "}
        <Link href="/ui-preview" className="text-accent underline underline-offset-4">
          view the storefront design system
        </Link>
        .
      </p>
    </div>
  );
}
