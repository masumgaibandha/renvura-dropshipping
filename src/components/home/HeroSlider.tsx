"use client";

import { clsx } from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import { IconArrowLeft, IconArrowRight } from "@/components/ui/icons";
import { heroSlides, type HeroSlide } from "./heroSlides";

const AUTOPLAY_DELAY_MS = 5500;

function ctaClass(isDark: boolean) {
  return clsx(
    "mt-1 inline-flex h-12 items-center rounded-full px-7 text-small font-semibold shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    isDark ? "bg-white text-ink hover:bg-brand-gold" : "bg-accent text-white hover:bg-accent-hover",
  );
}

/** Desktop text panel content — solid navy/cream background, sized for its ~42%-width column. */
function PanelContent({ slide }: { slide: HeroSlide }) {
  const isDark = slide.tone === "dark";
  return (
    <div className="flex max-w-md flex-col items-start gap-4">
      <span className={clsx("inline-flex items-center gap-2 text-label uppercase", isDark ? "text-brand-gold" : "text-accent")}>
        <slide.Icon className="size-4 shrink-0" />
        {slide.eyebrow}
      </span>
      <h2 className={clsx("text-h1", isDark ? "text-white" : "text-foreground")}>{slide.headline}</h2>
      <p className={clsx("max-w-sm text-body", isDark ? "text-white/75" : "text-foreground/70")}>{slide.subtext}</p>
      <Link href={slide.ctaHref} className={ctaClass(isDark)}>
        {slide.ctaLabel}
      </Link>
    </div>
  );
}

/** Mobile/tablet overlay content — always white-on-navy-scrim regardless of the slide's own tone, since the scrim (not a solid panel) is what's guaranteeing contrast against a real photo here. */
function OverlayContent({ slide }: { slide: HeroSlide }) {
  return (
    <div className="flex max-w-sm flex-col items-start gap-2.5">
      <span className="inline-flex items-center gap-2 text-label text-brand-gold uppercase">
        <slide.Icon className="size-4 shrink-0" />
        {slide.eyebrow}
      </span>
      <h2 className="text-h2 text-white">{slide.headline}</h2>
      <p className="text-small text-white/80">{slide.subtext}</p>
      <Link href={slide.ctaHref} className={ctaClass(true)}>
        {slide.ctaLabel}
      </Link>
    </div>
  );
}

/**
 * Premium homepage hero — a 5-slide carousel (one per major storefront
 * category plus a closing general/brand slide, see heroSlides.ts), now
 * built around real premium photography instead of a flat gradient panel
 * (that first pass was structurally approved but visually rejected — see
 * this component's git history for the gradient-only version).
 *
 * Full-bleed, not a floating card: this component renders `w-full` with no
 * rounded corners and no Container wrapper of its own — `page.tsx` renders
 * it directly, outside `Section`, specifically so no vertical padding or
 * max-width gutter sits between the navbar and the hero. Desktop (lg+) is a
 * split composition — a solid navy/cream text panel on the left (~42%
 * width, its own left padding roughly matching `Container`'s gutter so the
 * headline lines up with the nav/logo above it) and the photo filling the
 * remaining width, bleeding straight to the browser's right edge. Below
 * `lg`, the split collapses to a single full-bleed photo with the text
 * overlaid at the bottom on a navy scrim — this is deliberately always
 * navy-on-white regardless of the slide's own light/dark `tone` (which only
 * drives the desktop panel's own background), since a scrim over a real
 * photo needs one dependable contrast treatment rather than one that varies
 * by photo brightness.
 *
 * Slider mechanics (autoplay, prev/next, dot indicators, swipe) are
 * unchanged from the gradient-only version: native scroll-snap drives the
 * track so touch swipe/drag works for free, an IntersectionObserver keeps
 * `activeIndex` in sync with wherever the user actually scrolled to, and
 * autoplay pauses on hover/focus-within/pointer interaction and never runs
 * under `prefers-reduced-motion`.
 *
 * Each slide's photo needs a *different* object-position crop below `lg`
 * than at `lg`+, because both layout contexts crop significantly (the sub-lg
 * overlay is full-width and stays width-constrained — and therefore still
 * vertically cropping the photo — all the way up to 1023px, not just at true
 * phone widths) but land on different container aspect ratios. A plain
 * inline `style` can't switch by breakpoint, so the two positions
 * (`slide.imagePositionMobile`/`imagePositionDesktop`, see heroSlides.ts) are
 * passed in as CSS custom properties, and two static, breakpoint-gated
 * Tailwind arbitrary-property classes (`[object-position:var(--hero-img-pos-mobile)]`
 * / `lg:[object-position:var(--hero-img-pos-desktop)]`) pick between them —
 * this keeps the actual per-slide values data-driven while still getting
 * real breakpoint switching, which neither inline styles nor a single
 * Tailwind class alone can do for a value that's dynamic per slide.
 */
export function HeroSlider() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const visibilityRatios = useRef<number[]>(heroSlides.map(() => 0));
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const scrollToIndex = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    const slide = slideRefs.current[index];
    if (!scroller || !slide) return;
    scroller.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
  }, []);

  function goTo(index: number) {
    const next = (index + heroSlides.length) % heroSlides.length;
    setActiveIndex(next);
    scrollToIndex(next);
  }

  useEffect(() => {
    if (isPaused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % heroSlides.length;
        scrollToIndex(next);
        return next;
      });
    }, AUTOPLAY_DELAY_MS);
    return () => clearInterval(timer);
  }, [isPaused, scrollToIndex]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = slideRefs.current.findIndex((el) => el === entry.target);
          if (index !== -1) visibilityRatios.current[index] = entry.intersectionRatio;
        }
        const mostVisibleIndex = visibilityRatios.current.indexOf(Math.max(...visibilityRatios.current));
        if (mostVisibleIndex !== -1) setActiveIndex(mostVisibleIndex);
      },
      { root: scroller, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    slideRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      onPointerDown={() => setIsPaused(true)}
      onPointerUp={() => setIsPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured categories"
    >
      <div ref={scrollerRef} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {heroSlides.map((slide, index) => {
          const isDark = slide.tone === "dark";
          return (
            <div
              key={slide.id}
              ref={(el) => {
                slideRefs.current[index] = el;
              }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${heroSlides.length}`}
              className="relative h-[520px] w-full shrink-0 snap-center overflow-hidden sm:h-[500px] lg:h-[600px]"
            >
              {/* Photo — full slide below lg, right ~58% of it at lg+ */}
              <div className="absolute inset-0 lg:left-[42%]">
                <Image
                  src={slide.image}
                  alt={slide.headline}
                  fill
                  priority={index === 0}
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="object-cover [object-position:var(--hero-img-pos-mobile)] lg:[object-position:var(--hero-img-pos-desktop)]"
                  style={
                    {
                      "--hero-img-pos-mobile": slide.imagePositionMobile,
                      "--hero-img-pos-desktop": slide.imagePositionDesktop,
                    } as CSSProperties
                  }
                />
                {/* Bottom scrim for the mobile/tablet overlay's text legibility only — the lg+ panel is a solid color, not laid over the photo, so it needs no scrim. */}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent lg:hidden" />
              </div>

              {/* Desktop text panel */}
              <div className={clsx("absolute inset-y-0 left-0 hidden w-[42%] items-center lg:flex", isDark ? "bg-brand-navy" : "bg-surface-warm")}>
                <div className="w-full py-8 pr-8 pl-6 xl:pl-10">
                  <PanelContent slide={slide} />
                </div>
              </div>

              {/* Mobile/tablet overlay */}
              <div className="absolute inset-x-0 bottom-20 px-6 sm:px-10 lg:hidden">
                <OverlayContent slide={slide} />
              </div>
            </div>
          );
        })}
      </div>

      {/*
        Anchored to the photo half only (full width below lg, the right ~58% at lg+) — never the
        solid text panel, so the controls always sit on the same "glass over a photo" background
        instead of switching between a photo backdrop and a flat navy/cream one. The dark/blurred
        pill behind the controls is what keeps them legible regardless of which photo is showing,
        so dot/arrow color no longer needs to track each slide's own light/dark `tone` the way the
        gradient-only version's did.
      */}
      <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3 lg:left-[42%]">
        <div className="flex items-center gap-3 rounded-full bg-ink/45 px-3 py-2 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => goTo(activeIndex - 1)}
            className="flex size-7 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
          >
            <IconArrowLeft className="size-3.5" />
          </button>

          <div className="flex items-center gap-2">
            {heroSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === activeIndex}
                onClick={() => goTo(index)}
                className={clsx("h-2 rounded-full transition-all", index === activeIndex ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/75")}
              />
            ))}
          </div>

          <button
            type="button"
            aria-label="Next slide"
            onClick={() => goTo(activeIndex + 1)}
            className="flex size-7 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
          >
            <IconArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
