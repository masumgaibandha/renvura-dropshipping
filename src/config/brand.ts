/**
 * Centralized Renvura brand configuration.
 *
 * Values marked TODO are intentionally unset — do not invent contact
 * details, addresses, social URLs, or policies. Fill them in only when
 * the business supplies real information.
 */

export const brand = {
  name: "Renvura",
  tagline: "Authority, Refined",
  legalName: "TODO: legal/registered business name",
  description:
    "Renvura is a Bangladesh-focused e-commerce store for electronics, fashion, home & lifestyle, health & beauty, and more, with Cash on Delivery available nationwide.",

  locale: "en-BD",
  country: "BD",
  currency: {
    code: "BDT",
    symbol: "৳",
  },

  contact: {
    email: "TODO: support email",
    phone: "TODO: Bangladesh support phone number",
    whatsapp: "TODO: WhatsApp business number",
    address: {
      line1: "TODO",
      division: "TODO",
      district: "TODO",
      upazila: "TODO",
      postCode: "TODO",
    },
  },

  social: {
    facebook: "TODO: Facebook page URL",
    instagram: "TODO: Instagram profile URL",
    youtube: "TODO: YouTube channel URL",
    tiktok: "TODO: TikTok profile URL",
  },

  urls: {
    site: "https://www.renvura.com",
    github: "https://github.com/masumgaibandha/renvura-dropshipping",
  },

  /**
   * Paths are relative to /public. Assets are production copies of the
   * originals in assets/ — see docs/DESIGN-SYSTEM.md for usage rules
   * (never stretch, never redesign, pick variant by background contrast).
   */
  assets: {
    logo: {
      light: "/brand/logo-light.png",
      dark: "/brand/logo-dark.png",
    },
    appIcon: {
      light: "/brand/appicon-light.png",
      dark: "/brand/appicon-dark.png",
    },
    favicon: {
      light: "/brand/favicon-light.png",
      dark: "/brand/favicon-dark.png",
    },
    banner: {
      light: "/brand/banner-light.png",
      dark: "/brand/banner-dark.png",
    },
    profile: {
      light: "/brand/profile-light.png",
      dark: "/brand/profile-dark.png",
    },
  },

  /** Sampled directly from the brand assets — see docs/DESIGN-SYSTEM.md */
  colors: {
    navy: "#11253C",
    cream: "#F7F1E5",
    gold: "#CDAF80",
  },
} as const;

/**
 * A brand config value that hasn't been supplied yet (still a "TODO: ..."
 * placeholder). Use this before rendering any brand.contact/social value
 * to a page — never show a literal "TODO: ..." string to a user.
 */
export function isConfigured(value: string): boolean {
  return !value.startsWith("TODO");
}

export type Brand = typeof brand;
