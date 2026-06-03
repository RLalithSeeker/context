import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
// Keep nav + footer: they hold anchor menus and credit links worth capturing in markdown.
const NOISE = 'script, style, aside, iframe, noscript';

export async function fetchHtml(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    redirect: 'follow',
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  return resp.text();
}

export function getTitle(html: string): string {
  const $ = cheerio.load(html);
  return $('title').text().trim() || '';
}

export function getMeta(html: string): Record<string, string> {
  const $ = cheerio.load(html);
  const meta: Record<string, string> = {};
  $('meta').each((_, el) => {
    const name = $(el).attr('name') || $(el).attr('property');
    const content = $(el).attr('content');
    if (name && content) meta[name] = content;
  });
  return meta;
}

export function cleanHtml(html: string, baseUrl?: string): string {
  const $ = cheerio.load(html);
  $(NOISE).remove();
  // Resolve relative hrefs/srcs to absolute so links + images survive as full URLs in markdown.
  if (baseUrl) {
    $('a[href]').each((_, el) => {
      const h = $(el).attr('href');
      if (h && !h.startsWith('#') && !h.startsWith('mailto:') && !h.startsWith('javascript:')) {
        try { $(el).attr('href', new URL(h, baseUrl).href); } catch {}
      }
    });
    $('img[src]').each((_, el) => {
      const s = $(el).attr('src');
      if (s) { try { $(el).attr('src', new URL(s, baseUrl).href); } catch {} }
    });
  }
  for (const sel of ['main', 'article', '[role="main"]', '#content', '.content', '.post', '.entry']) {
    const el = $(sel).first();
    if (el.length && el.text().trim().length > 100) return el.html() || '';
  }
  return $('body').html() || html;
}

export function toMarkdown(html: string): string {
  return turndown.turndown(html);
}

export function getLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    try {
      const full = new URL(href, baseUrl).href;
      if (full.startsWith('http')) links.add(full);
    } catch {}
  });
  return [...links];
}

export function getImages(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const images = new Set<string>();
  $('img').each((_, el) => {
    for (const attr of ['src', 'data-src', 'data-lazy-src']) {
      const src = $(el).attr(attr);
      if (src) { try { images.add(new URL(src, baseUrl).href); } catch {} }
    }
    const srcset = $(el).attr('srcset') || '';
    srcset.split(',').forEach(s => {
      const u = s.trim().split(' ')[0];
      if (u) { try { images.add(new URL(u, baseUrl).href); } catch {} }
    });
  });
  const og = $('meta[property="og:image"]').attr('content');
  if (og) { try { images.add(new URL(og, baseUrl).href); } catch {} }
  return [...images];
}

export function getCssUrls(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) { try { urls.add(new URL(href, baseUrl).href); } catch {} }
  });
  return [...urls];
}

export async function fetchCss(url: string): Promise<string> {
  try {
    const resp = await fetch(url);
    return resp.ok ? resp.text() : '';
  } catch { return ''; }
}

export function getFonts(html: string, baseUrl: string) {
  const $ = cheerio.load(html);
  const fonts = new Set<string>();
  $('link[href*="fonts.googleapis.com"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const match = href.match(/family=([^&]+)/);
    if (match) match[1].replace(/\+/g, ' ').split('|').forEach(f => fonts.add(f.split(':')[0]));
  });
  $('style').each((_, el) => {
    const text = $(el).html() || '';
    const m = text.matchAll(/font-family:\s*["']([^"']+)["']/gi);
    for (const f of m) fonts.add(f[1]);
  });
  return { googleFonts: [...fonts].sort(), fontFaces: [] as string[], total: fonts.size };
}

export function getLogoUrl(html: string, baseUrl: string): { logo_url: string; method: string } {
  const $ = cheerio.load(html);
  const og = $('meta[property="og:image"]').attr('content');
  if (og) return { logo_url: new URL(og, baseUrl).href, method: 'og:image' };
  const apple = $('link[rel="apple-touch-icon"]').attr('href') || $('link[rel="apple-touch-icon-precomposed"]').attr('href');
  if (apple) return { logo_url: new URL(apple, baseUrl).href, method: 'apple-touch-icon' };
  const icon = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href');
  if (icon) return { logo_url: new URL(icon, baseUrl).href, method: 'favicon' };
  return { logo_url: new URL('/favicon.ico', baseUrl).href, method: 'fallback' };
}
