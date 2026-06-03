# context-web

Remake of context.dev — Next.js MCP + REST API for website data extraction.
Live at: https://context-mcp-psi.vercel.app
GitHub: https://github.com/RLalithSeeker/context

## Project Skills
- ui-ux-pro-max -> .claude/skills/ui-ux-pro-max/SKILL.md
- frontend-designer -> .claude/agents/frontend-designer.md

## What This Is
16-tool API (MCP + REST) behind one endpoint. You bring your own Groq key.
Tools: scrape_markdown, scrape_html, crawl, extract_images, sitemap,
extract_structured, query, product, brand, styleguide, design_extract,
fonts, classify_naics, classify_sic, transaction, logo.

## Key Files
```
app/page.tsx              Landing + playground UI (16 tools, tab switcher)
app/api/tools/route.ts    POST /api/tools dispatcher
app/api/mcp/              MCP server endpoint
lib/tools.ts              All 16 tool implementations
lib/scraping.ts           Cheerio + Turndown scraping utils
lib/groq.ts               Groq client (BYOK via AsyncLocalStorage)
lib/css-analyzer.ts       Frequency-based CSS token extractor (no LLM)
lib/design-outputs.ts     Output format generators (DESIGN.md / Tailwind / CSS vars / W3C tokens)
prompts/                  LLM system prompts for each AI tool
```

## design_extract Tool (tool #16) — Session 2026-06-03
Goal: match design-extractor.com quality. Uses CSSOM frequency analysis, NOT LLM for tokens.

### How it works
1. Fetch HTML + up to 120KB CSS (6 files × 25KB + inline styles)
2. `analyzeCss()` → frequency-count every hex color, font-size, spacing value
3. CSS variables detected first (--color-primary: #hex = guaranteed token)
4. Groq (llama-3.3-70b) called ONLY for: overview, style_tags, components, dos/donts
5. Generate 4 output formats

### Output formats (all in one API call)
- `outputs.design_md`      DESIGN.md — structured markdown for AI coding agents
- `outputs.tailwind`       Tailwind v4 @theme block
- `outputs.css_variables`  :root { --color-X: #hex; } block
- `outputs.design_tokens`  W3C design tokens JSON
- `outputs.agent_file`     Same as design_md

### css-analyzer.ts logic
- CSS vars parsed first (--color-*, --font-*, --spacing-*, --radius-*)
- Hex frequency: counts every #rrggbb occurrence in full CSS
- Font sizes: normalized to px before sorting (7.5em=120px > 18px)
- Spacing: margin/padding/gap/row-gap/column-gap/inset, 4px–200px range
- Border radius: strips !important before storing
- Color grouping: neutrals (s<12%), brand, semantic (green/red/yellow hues)
- Detects: Tailwind, Bootstrap, Chakra, MUI, Ant Design, shadcn

### UI features (page.tsx)
- Groq key: saved to localStorage, survives refresh, shows "● saved locally"
- Result panel: 5 tabs for design_extract (DESIGN.md / Tailwind v4 / CSS Variables / Design Tokens / Full JSON)
- Copy + Download buttons act on the active tab only
- Other tools: single JSON tab

## Known Gaps vs design-extractor.com
- Color frequency counts are lower (ours: ~15×, theirs: ~400×) because they use
  browser-rendered CSSOM (headless). We parse raw CSS server-side.
  Workaround: we also detect CSS variables which are more accurate than frequency alone.
- Typography weights not yet combined into compound tokens (family+size+weight+lineHeight).
  design-extractor.com does this. Future improvement.

## Architecture Notes
- BYOK: server holds NO Groq key. Per-request via AsyncLocalStorage.
- Non-AI tools (scrape, crawl, fonts, logo, etc.) need no key.
- `cmd_design_extract` runs brand + narrative Groq calls in parallel.
- CSS cap: 120KB total (6 files × 25KB + inline).

## Env
```
GROQ_API_KEY=   (optional server default — BYOK preferred)
```

## Deploy
Push to main → Vercel auto-deploys. No manual step needed.
