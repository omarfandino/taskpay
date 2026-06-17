/** Set NEXT_PUBLIC_DEMO_STORAGE_MODE=true at build time (Vercel / .env.local). */
export const DEMO_STORAGE_MODE =
  process.env.NEXT_PUBLIC_DEMO_STORAGE_MODE === "true";
