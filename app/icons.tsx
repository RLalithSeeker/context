// Lucide-style inline SVG icons (stroke, currentColor) — replaces emoji per ui-ux-pro-max no-emoji-icons rule.
import { ReactNode } from "react";

const s = (children: ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export const ICONS: Record<string, ReactNode> = {
  scrape_markdown: s(<><path d="M4 4h16v16H4z" /><path d="M7 15V9l3 3 3-3v6" /><path d="M17 9v6" /><path d="m19 13-2 2-2-2" /></>),
  scrape_html: s(<><path d="m8 9-3 3 3 3" /><path d="m16 9 3 3-3 3" /><path d="m13 7-2 10" /></>),
  crawl: s(<><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" /></>),
  extract_images: s(<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></>),
  sitemap: s(<><rect x="9" y="3" width="6" height="5" rx="1" /><rect x="3" y="16" width="6" height="5" rx="1" /><rect x="15" y="16" width="6" height="5" rx="1" /><path d="M12 8v4M6 16v-2h12v2" /></>),
  extract_structured: s(<><path d="M12 2a3 3 0 0 1 3 3 3 3 0 0 1 0 6 3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1 0-6 3 3 0 0 1 3-3Z" /><path d="M12 14v8M8 22h8" /></>),
  query: s(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M9 10h6M9 13h4" /></>),
  product: s(<><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18M16 10a4 4 0 0 1-8 0" /></>),
  brand: s(<><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h6M9 12h6M9 16h3" /></>),
  styleguide: s(<><circle cx="13.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="12" r="2.5" /><circle cx="8.5" cy="7.5" r="2.5" /><circle cx="6.5" cy="13" r="2.5" /><path d="M12 22a10 10 0 1 1 0-20" /></>),
  fonts: s(<><path d="M4 7V5h16v2M9 19h6M12 5v14" /></>),
  classify_naics: s(<><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" /><rect x="12" y="7" width="3" height="10" /><rect x="17" y="13" width="3" height="4" /></>),
  classify_sic: s(<><path d="M3 3v18h18" /><path d="m7 14 3-3 3 3 5-6" /></>),
  transaction: s(<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></>),
  logo: s(<><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></>),
};

export const Rocket = s(<><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></>);
export const Github = s(<><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></>);
