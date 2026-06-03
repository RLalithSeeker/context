import {
  fetchHtml, getTitle, getMeta, cleanHtml, toMarkdown,
  getLinks, getImages, getCssUrls, fetchCss, getFonts, getLogoUrl,
} from './scraping';
import { loadPrompt, callGroq, callGroqText } from './groq';
import { analyzeCss } from './css-analyzer';
import { toDesignMd, toTailwindV4, toCssVariables, toDesignTokensJson, type NarrativeLayer } from './design-outputs';

// ── 1. scrape_markdown (no LLM) ──
export async function cmd_scrape_markdown(url: string) {
  const html = await fetchHtml(url);
  const md = toMarkdown(cleanHtml(html, url));
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
      const md = toMarkdown(cleanHtml(html, cur));
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
  const md = toMarkdown(cleanHtml(html, url));
  let system = await loadPrompt('extract_structured');
  if (instruction) system += `\n\nADDITIONAL: ${instruction}`;
  return callGroq(system, `JSON Schema:\n${schema}\n\nContent:\n${md}`);
}

// ── 7. query (LLM) ──
export async function cmd_query(url: string, question: string) {
  const html = await fetchHtml(url);
  const md = toMarkdown(cleanHtml(html, url));
  return callGroqText(await loadPrompt('query_website'), `QUESTION: ${question}\n\nCONTENT:\nTitle: ${getTitle(html)}\n\n${md}`);
}

// ── 8. product (LLM) ──
export async function cmd_product(url: string) {
  const html = await fetchHtml(url);
  const md = toMarkdown(cleanHtml(html, url));
  return callGroq(await loadPrompt('product_extraction'), `Content:\n${md}\n\nMeta: ${JSON.stringify(getMeta(html))}`);
}

// ── 9. brand (LLM) ──
export async function cmd_brand(url: string) {
  const html = await fetchHtml(url);
  const md = toMarkdown(cleanHtml(html, url));
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

// ── 16. design_extract (frequency analysis + LLM narrative) ──
export async function cmd_design_extract(url: string) {
  const html = await fetchHtml(url);
  const title = getTitle(html);
  const meta = getMeta(html);

  // Fetch ALL CSS — much more than the old styleguide tool
  const cssUrls = getCssUrls(html, url);
  const cssParts: string[] = [];

  // Inline styles
  const { load } = await import('cheerio');
  const $ = load(html);
  $('style').each((_: any, el: any) => { const t = $(el).text(); if (t.length > 20) cssParts.push(t); });

  // External CSS — 25KB per file, up to 6 files
  const fetches = cssUrls.slice(0, 6).map(async (cu: string) => {
    try {
      const r = await fetch(cu, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
      if (r.ok) cssParts.push((await r.text()).slice(0, 25000));
    } catch {}
  });
  await Promise.all(fetches);

  const fullCss = cssParts.join('\n').slice(0, 120000);

  // Frequency-based token extraction (no LLM)
  const design = analyzeCss(fullCss, html);

  // Content for LLM narrative
  const md = toMarkdown(cleanHtml(html, url)).slice(0, 6000);

  // Run brand + narrative in parallel
  const [brandResult, narrativeResult] = await Promise.all([
    callGroq(await loadPrompt('brand_intelligence'),
      `URL: ${url}\nTitle: ${title}\nMeta: ${JSON.stringify(meta)}\n\n${md}`
    ),
    callGroq(
      `You are a design system analyst. Based on the extracted design data, return JSON with:
- "overview": string (2-3 sentences describing visual personality, tone, and design philosophy)
- "style_tags": string[] (4-6 lowercase adjectives like "minimal", "modern", "bold")
- "components": [{name: string, description: string}] (3-5 key UI components you can infer)
- "dos": string[] (3-4 design do's from the system)
- "donts": string[] (3-4 design don'ts)`,
      `Site: ${title} (${url})
Colors: ${design.colors.slice(0,8).map(c=>`${c.hex} (${c.name}/${c.group})`).join(', ')}
Fonts: ${design.typography.font_families.slice(0,3).join(', ')}
Type scale: ${design.typography.type_scale.slice(0,5).map(t=>`${t.role}=${t.size}`).join(', ')}
Spacing base: ${design.spacing.base_unit}
Radius: ${design.border_radius.values.slice(0,4).join(', ')}
Design system: ${design.design_system_detected || 'custom'}
Has shadows: ${design.shadows.length > 0}
${md.slice(0, 2000)}`
    ),
  ]);

  const brand = brandResult.data as any || {};
  const narrative: NarrativeLayer = {
    overview: narrativeResult.data?.overview || brand.description || '',
    style_tags: narrativeResult.data?.style_tags || [],
    components: narrativeResult.data?.components || [],
    dos: narrativeResult.data?.dos || [],
    donts: narrativeResult.data?.donts || [],
  };

  const brandInfo = {
    name: brand.brand_name || brand.company_name || title || new URL(url).hostname,
    industry: brand.industry || null,
    description: brand.description || null,
  };

  const design_md     = toDesignMd(design, brandInfo, url, narrative);
  const tailwind      = toTailwindV4(design);
  const css_variables = toCssVariables(design);
  const design_tokens = toDesignTokensJson(design, brandInfo);

  return {
    url,
    title: brandInfo.name,
    brand: { ...brand, ...brandInfo },
    design,
    overview: narrative.overview,
    style_tags: narrative.style_tags,
    outputs: {
      design_md,
      tailwind,
      css_variables,
      design_tokens,
      agent_file: design_md, // same as design_md — drop into AI agent context
    },
    tokens_used: (brandResult.tokens_used || 0) + (narrativeResult.tokens_used || 0),
  };
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
  const md = toMarkdown(cleanHtml(html, url));
  return callGroq(await loadPrompt('classify_industry'), `URL: ${url}\nTitle: ${getTitle(html)}\nMeta: ${JSON.stringify(getMeta(html))}\n\n${md.substring(0, 8000)}\n\nClassify into NAICS (6-digit) codes.`);
}

// ── 13. classify_sic (LLM) ──
export async function cmd_classify_sic(url: string) {
  const html = await fetchHtml(url);
  const md = toMarkdown(cleanHtml(html, url));
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
