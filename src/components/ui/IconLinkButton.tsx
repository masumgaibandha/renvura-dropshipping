import Link from "next/link";
import { clsx } from "clsx";
import type { ReactNode } from "react";

interface IconLinkButtonProps {
  href: string;
  "aria-label": string;
  children: ReactNode;
  className?: string;
}

/**
 * Icon (optionally icon+label) navigational button. HeroUI's `Button`
 * renders a `<button>` (react-aria-components), which can't be an `<a>`,
 * and HeroUI's `Link` is styled for text links — so header/drawer icon
 * actions (wishlist, account, cart) use a plain, real `next/link` styled
 * to match, which also keeps them simple `<a>` tags for SEO/crawling and
 * keyboard nav. Icon-only usages stay a min-11 square pill; passing a
 * text label alongside the icon (e.g. header Cart/Login) widens it
 * naturally via the flex gap/padding.
 */
export function IconLinkButton({ href, children, className, ...props }: IconLinkButtonProps) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2.5 text-foreground/80 transition-colors hover:bg-background-secondary hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
