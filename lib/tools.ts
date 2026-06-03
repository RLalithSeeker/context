import {
  fetchHtml, getTitle, getMeta, cleanHtml, toMarkdown,
  getLinks, getImages, getCssUrls, fetchCss, getFonts, getLogoUrl,
} from './scraping';
import { loadPrompt, callGroq, callGroqText } from './groq';

// ── 1. scrape_markdown (no LLM) ──
export async function cmd_scrape_markdown(url: string) {
  const html = await fetchHtml(url);
  const md = toMarkdown(cleanHtml(html));
  return { url, title: getTitle(html), markdown: md, word_count: md.split(/\s+/).filter(Boolean).length, meta: getMeta(html) };
}

// ── 2. scrape_html (no LLM) ──
export async function cmd_scrape_html(url: string, selector?: string) {
  const html = await fetchHtml(url);
  if (selector) {
    const $ = require('cheerio').load(html);
    const el = $(selector).first();
    return { url, title: getTitle(html), html: el.length ? el.html() || '' : '' };
  }
  return { url, title: getTitle(html), html };
}

// ── 3. crawl (no LLM) ──
export async function cmd_crawl(url: string, maxPages: number = 20, maxDepth: number = 3) {
  const seedDomain = new URL(url).hostname;
  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [{ url, depth: 0 }];
  const pages: any[] = [];
  while (queue.length > 0 && pages.length < maxPages) {
    const { url: cur, depth } = queue.shift()!;
    if (visited.has(cur) || depth > maxDepth) continue;
    visited.add(cur);
    try {
      const html = await fetchHtml(cur);
      const md = toMarkdown(cleanHtml(html));
      pages.push({ url: cur, title: getTitle(html), markdown: md, depth, word_count: md.split(/\s+/).filter(Boolean).length });
      for (const link of getLinks(html, cur)) {
        const ld = new URL(link).hostname;
        const ext = link.split('.').pop()?.toLowerCase() || '';
        if (ld === seedDomain && !['jpg','jpeg','png','gif','svg','pdf','zip','css','js','ico','woff','woff2','ttf','eot'].includes(ext)) {
          if (!visited.has(link)) queue.push({ url: link, depth: depth + 1 });
        }
      }
    } catch (e: any) { pages.push({ url: cur, error: e.message }); }
    await new Promise(r => setTimeout(r, 200));
  }
  return { pages_crawled: pages.length, urls_visited: visited.size, pages };
}

// ── 4. extract_images (no LLM) ──
export async function cmd_extract_images(url: string) {
  const html = await fetchHtml(url);
  const images = getImages(html, url);
  return { url, images, count: images.length };
}

// ── 5. sitemap (no LLM) ──
export async function cmd_sitemap(url: string) {
  let sitemapUrl = url;
  if (!url.endsWith('.xml') && !url.endsWith('.xml.gz')) {
    const base = url.replace(/\/+$/, '');
    for (const c of [`${base}/sitemap.xml`, `${base}/sitemap_index.xml`]) {
      try { const r = await fetch(c, { method: 'HEAD' }); if (r.ok) { sitemapUrl = c; break; } } catch {}
    }
  }
  const resp = await fetch(sitemapUrl);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const xml = await resp.text();
  const urls: any[] = [];
  const locRegex = /<loc>([^<]+)<\/loc>/gi;
  let m;
  while ((m = locRegex.exec(xml)) !== null) {
    const loc = m[1];
    const entry: any = { loc };
    const parent = xml.substring(Math.max(0, m.index - 200), m.index + 200);
    const lastmod = parent.match(/<lastmod>([^<]+)<\/lastmod>/i);
    if (lastmod) entry.lastmod = lastmod[1];
    const priority = parent.match(/<priority>([^<]+)<\/priority>/i);
    if (priority) entry.priority = priority[1];
    urls.push(entry);
  }
  const isIndex = xml.includes('<sitemapindex');
  return { sitemap_url: sitemapUrl, type: isIndex ? 'sitemapindex' : 'urlset', urls, total_urls: urls.length };
}

// ── 6. extract_structured (LLM) ──
export async function cmd_extract_structured(url: string, schema: string, instruction?: string) {
  const html = await fetchHtml(url);
  const md = toMarkdown(cleanHtml(html));
  let system = await loadPrompt('extract_structured');
  if (instruction) system += `\n\nADDITIONAL: ${instruction}`;
  return callGroq(system, `JSON Schema:\n${schema}\n\nContent:\n${md}`);
}

// ── 7. query (LLM) ──
export async function cmd_query(url: string, question: string) {
  const html = await fetchHtml(url);
  const md = toMarkdown(cleanHtml(html));
  return callGroqText(await loadPrompt('query_website'), `QUESTION: ${question}\n\nCONTENT:\nTitle: ${getTitle(html)}\n\n${md}`);
}

// ── 8. product (LLM) ──
export async function cmd_product(url: string) {
  const html = await fetchHtml(url);
  const md = toMarkdown(cleanHtml(html));
  return callGroq(await loadPrompt('product_extraction'), `Content:\n${md}\n\nMeta: ${JSON.stringify(getMeta(html))}`);
}

// ── 9. brand (LLM) ──
export async function cmd_brand(url: string) {
  const html = await fetchHtml(url);
  const md = toMarkdown(cleanHtml(html));
  return callGroq(await loadPrompt('brand_intelligence'), `URL: ${url}\nTitle: ${getTitle(html)}\nMeta: ${JSON.stringify(getMeta(html))}\n\nContent:\n${md.substring(0, 8000)}`);
}

// ── 10. styleguide (LLM) ──
export async function cmd_styleguide(url: string) {
  const html = await fetchHtml(url);
  const cssUrls = getCssUrls(html, url);
  let cssContent = '';
  for (const cu of cssUrls.slice(0, 5)) {
    try { const r = await fetchCss(cu); if (r) cssContent += `\n/* ${cu} */\n${r.substring(0, 3000)}`; } catch {}
  }
  return callGroq(await loadPrompt('styleguide_extraction'), `CSS:\n${cssContent.substring(0, 10000)}\n\nHTML:\n${html.substring(0, 5000)}`);
}

// ── 11. fonts (no LLM) ──
export async function cmd_fonts(url: string) {
  const html = await fetchHtml(url);
  const fonts = getFonts(html, url);
  const cssUrls = getCssUrls(html, url);
  for (const cu of cssUrls.slice(0, 5)) {
    try {
      const css = await fetchCss(cu);
      const matches = css.matchAll(/font-family:\s*["']([^"']+)["']/gi);
      for (const m of matches) (fonts.fontFaces as string[]).push(m[1]);
    } catch {}
  }
  return { url, ...fonts, fontFaces: [...new Set<string>(fonts.fontFaces as string[])].sort(), total: new Set([...fonts.googleFonts, ...fonts.fontFaces]).size };
}

// ── 12. classify_naics (LLM) ──
export async function cmd_classify_naics(url: string) {
  const html = await fetchHtml(url);
  const md = toMarkdown(cleanHtml(html));
  return callGroq(await loadPrompt('classify_industry'), `URL: ${url}\nTitle: ${getTitle(html)}\nMeta: ${JSON.stringify(getMeta(html))}\n\n${md.substring(0, 8000)}\n\nClassify into NAICS (6-digit) codes.`);
}

// ── 13. classify_sic (LLM) ──
export async function cmd_classify_sic(url: string) {
  const html = await fetchHtml(url);
  const md = toMarkdown(cleanHtml(html));
  return callGroq(await loadPrompt('classify_industry'), `URL: ${url}\nTitle: ${getTitle(html)}\nMeta: ${JSON.stringify(getMeta(html))}\n\n${md.substring(0, 8000)}\n\nClassify into SIC (4-digit) codes.`);
}

// ── 14. transaction (LLM) ──
export async function cmd_transaction(descriptor: string, amount?: number) {
  return callGroq(await loadPrompt('transaction_enrichment'), `Descriptor: ${descriptor}\n${amount ? `Amount: ${amount}` : ''}`);
}

// ── 15. logo (no LLM) ──
export async function cmd_logo(url: string) {
  const html = await fetchHtml(url);
  return getLogoUrl(html, url);
}
