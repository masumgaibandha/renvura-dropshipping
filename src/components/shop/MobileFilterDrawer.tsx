"use client";

import { Drawer, useOverlayState } from "@heroui/react";
import type { ReactNode } from "react";

import { IconGrid } from "@/components/ui/icons";

interface MobileFilterDrawerProps {
  children: ReactNode;
}

/**
 * Mobile filter sheet — same HeroUI Drawer composed-API pattern already
 * used in layout/MobileNav.tsx (focus trapping, Escape-to-close, focus
 * return come from react-aria's Modal/Dialog underneath, not reimplemented
 * here). `children` is the same filter content rendered inline on desktop
 * (category pills + sort) — composed once in ProductListingPage.tsx and
 * placed twice via responsive visibility, not duplicated markup.
 */
export function MobileFilterDrawer({ children }: MobileFilterDrawerProps) {
  const state = useOverlayState();

  return (
    <Drawer.Root state={state}>
      <Drawer.Trigger className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-4 text-small font-medium text-foreground transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
        <IconGrid className="size-4" />
        Filters
      </Drawer.Trigger>
      <Drawer.Backdrop>
        <Drawer.Content placement="bottom" className="max-h-[80vh]">
          <Drawer.Dialog className="flex h-full flex-col">
            <Drawer.Header className="flex items-center justify-between border-b border-border px-4 py-4">
              <p className="text-h3">Filters</p>
              <Drawer.CloseTrigger aria-label="Close filters" />
            </Drawer.Header>
            <Drawer.Body className="flex-1 overflow-y-auto px-4 py-4">{children}</Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  );
}
