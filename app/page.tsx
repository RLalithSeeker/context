"use client";
import { useState, useEffect } from "react";

const BASE = "https://context-mcp-psi.vercel.app";
const MCP_URL = `${BASE}/api/mcp`;
const GH = "https://github.com/RLalithSeeker/context";

/* Material Symbols icon helper (loaded in layout.tsx) */
function Icon({ name, size = 18, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size, lineHeight: 1 }}>
      {name}
    </span>
  );
}

type Tool = { id: string; label: string; needsExtra?: "question" | "schema" };

const TOOLS: Tool[] = [
  { id: "scrape_markdown", label: "scrape_markdown" },
  { id: "scrape_html", label: "scrape_html" },
  { id: "crawl", label: "crawl" },
  { id: "extract_images", label: "extract_images" },
  { id: "sitemap", label: "sitemap" },
  { id: "extract_structured", label: "extract", needsExtra: "schema" },
  { id: "query", label: "query", needsExtra: "question" },
  { id: "product", label: "product" },
  { id: "brand", label: "brand" },
  { id: "styleguide", label: "styleguide" },
  { id: "design_extract", label: "design_extract" },
  { id: "fonts", label: "fonts" },
  { id: "classify_naics", label: "naics" },
  { id: "classify_sic", label: "sic" },
  { id: "transaction", label: "transaction" },
  { id: "logo", label: "logo" },
];

const LLM_TOOLS = new Set([
  "extract_structured", "query", "product", "brand", "styleguide",
  "design_extract", "classify_naics", "classify_sic", "transaction",
]);

const HERO_TABS: Record<string, string> = {
  cURL: `curl -X POST ${BASE}/api/tools \\
  -H "x-groq-key: $GROQ_KEY" \\
  -d '{"command":"brand","url":"stripe.com"}'`,
  TypeScript: `const res = await fetch("${BASE}/api/tools", {
  method: "POST",
  headers: { "x-groq-key": process.env.GROQ_KEY! },
  body: JSON.stringify({ command: "brand", url: "stripe.com" }),
});
const { data } = await res.json();`,
  MCP: `{
  "mcpServers": {
    "context-mcp": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote@latest", "${MCP_URL}",
        "--header", "x-groq-key:\${GROQ_KEY}"
      ]
    }
  }
}`,
};

type UseCase = {
  icon: string; kicker: string; title: string; body: string;
  req: string; res: string; tool: string; url: string;
};
const USE_CASES: UseCase[] = [
  {
    icon: "visibility", kicker: "AI Agent Web Access", title: "Give agents eyes on the live web",
    body: "Let any MCP agent read and reason over real pages in real time — scrape to clean markdown, no headless browser to babysit.",
    req: `POST /api/tools\n{ "command": "scrape_markdown",\n  "url": "vercel.com/pricing" }`,
    res: `# Vercel Pricing\nHobby — $0/mo\nPro — $20/mo …`,
    tool: "scrape_markdown", url: "https://vercel.com/pricing",
  },
  {
    icon: "account_tree", kicker: "RAG & Knowledge Pipelines", title: "Feed your LLM up-to-date context",
    body: "Crawl a sitemap, extract structured markdown, and pipe clean, current web content straight into your knowledge base.",
    req: `POST /api/tools\n{ "command": "crawl",\n  "url": "docs.python.org" }`,
    res: `{ "pages_crawled": 20,\n  "pages": [{ "title": …,\n    "markdown": … }] }`,
    tool: "crawl", url: "https://docs.python.org",
  },
  {
    icon: "biotech", kicker: "Research & Enrichment", title: "Resolve a domain into a typed company",
    body: "Turn any URL into structured firmographics — name, industry, colors, fonts, socials — for CRM enrichment and lead scoring.",
    req: `POST /api/tools\n{ "command": "brand",\n  "url": "stripe.com" }`,
    res: `{ "company_name": "Stripe",\n  "industry": "Finance",\n  "colors": ["#635bff", …] }`,
    tool: "brand", url: "https://stripe.com",
  },
];

const FAQ: { q: string; a: string }[] = [
  { q: "Do I need a Groq API key?", a: "Only for the 9 AI tools (extract, query, product, brand, styleguide, design_extract, naics, sic, transaction). The scraping tools — scrape, html, crawl, sitemap, images, fonts, logo — need no key at all." },
  { q: "Is my key stored anywhere?", a: "No. Your key is used for that single request to Groq and never persisted or logged on the server. In the playground it lives only in your browser's localStorage — clear it any time." },
  { q: "Whose key runs the AI tools?", a: "Yours. The server holds no Groq key of its own, so you're never billed for someone else's traffic and we're never billed for yours. Get a free key at console.groq.com/keys." },
  { q: "How do I pass the key?", a: "REST: x-groq-key header (or apiKey in the JSON body). MCP: add --header \"x-groq-key:$GROQ_KEY\" to the mcp-remote args, as shown in the Connect section." },
  { q: "Can I self-host?", a: "Yes — it's a standard Next.js app. Clone the repo, deploy to Vercel (or anywhere), done. Source is on GitHub." },
];

// Localized from the Stitch export so they never expire (the original aida URLs are session-scoped).
const BG_TEXTURE = "/bg-texture.jpg"; // red circuit/lava — global ambient behind every section
const BG_TREE = "/bg-flourish.jpg"; // cherry-tree + sun + bird — per-section decorative flourish (compressed 1.9MB→199KB)

export default function Home() {
  const [url, setUrl] = useState("");
  const [tool, setTool] = useState<Tool>(TOOLS[8]);
  const [extraVal, setExtraVal] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [heroTab, setHeroTab] = useState("cURL");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [outputTab, setOutputTab] = useState("DESIGN.md");

  useEffect(() => {
    try { const k = localStorage.getItem("groq_key"); if (k) setGroqKey(k); } catch {}
  }, []);

  useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: MouseEvent) => {
      main.style.setProperty("--mouse-x", `${e.clientX}px`);
      main.style.setProperty("--mouse-y", `${e.clientY}px`);
    };
    main.style.setProperty("--mouse-x", `${window.innerWidth / 2}px`);
    main.style.setProperty("--mouse-y", `${window.innerHeight / 2}px`);
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  function saveKey(v: string) {
    setGroqKey(v);
    try { v ? localStorage.setItem("groq_key", v) : localStorage.removeItem("groq_key"); } catch {}
  }
  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(""), 1600); });
  }
  function download(content: string, filename: string, mime = "text/plain") {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }
  function tryCase(uc: UseCase) {
    const t = TOOLS.find((x) => x.id === uc.tool)!;
    setTool(t); setUrl(uc.url); setExtraVal(""); setResult(null); setError("");
    scrollTo("console");
  }

  async function run() {
    setLoading(true); setError(""); setResult(null);
    try {
      const body: any = { command: tool.id, url };
      if (tool.needsExtra === "question" && extraVal) body.question = extraVal;
      if (tool.needsExtra === "schema" && extraVal) body.schema = extraVal;
      const resp = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(groqKey ? { "x-groq-key": groqKey } : {}) },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setOutputTab("DESIGN.md");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const needsKey = LLM_TOOLS.has(tool.id);

  const sectionHead = "text-center mb-10 max-w-2xl mx-auto relative z-10";
  const kicker = "font-label-caps text-label-caps text-primary mb-2 block";

  return (
    <>
      {/* TopNavBar */}
      <nav className="bg-background/90 backdrop-blur-md border-b border-border-subtle fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-mobile md:px-gutter h-16">
        <div className="flex items-center gap-gutter max-w-container-max mx-auto w-full justify-between md:justify-start">
          <a className="font-display-lg text-headline-lg text-text-primary tracking-tight" href="#">Context-MCP</a>
          <div className="hidden md:flex gap-gutter">
            <button onClick={() => scrollTo("usecases")} className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200 font-label-caps text-label-caps">Use Cases</button>
            <button onClick={() => scrollTo("connect")} className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200 font-label-caps text-label-caps">Docs</button>
          </div>
          <div className="items-center gap-base hidden md:flex md:ml-auto">
            <button onClick={() => scrollTo("console")} className="font-label-caps text-label-caps text-blood-red hover:text-primary transition-colors duration-200 border border-border-subtle px-4 py-2 rounded-lg bg-surface/50">Try it live</button>
            <a href={GH} target="_blank" rel="noreferrer" className="font-label-caps text-label-caps bg-primary-container text-on-primary-container hover:bg-blood-red transition-colors duration-200 px-4 py-2 rounded-lg flex items-center gap-2">
              <Icon name="star" size={16} /> Star on GitHub
            </a>
          </div>
          <button className="md:hidden text-text-primary" onClick={() => scrollTo("console")}>
            <Icon name="terminal" />
          </button>
        </div>
      </nav>

      <main className="w-full relative" id="main-content" style={{ ["--mouse-x" as any]: "50%", ["--mouse-y" as any]: "50%" }}>
        {/* Persistent global background (fixed — stays behind every section on scroll) */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <img alt="" className="w-full h-full object-cover fixed opacity-50 ambient-pulse" src={BG_TEXTURE} />
          <div className="fixed inset-0 bg-background/80 backdrop-brightness-75" />
          <div className="hero-glow fixed" />
        </div>

        {/* Hero */}
        <section className="relative w-full pt-32 pb-32 flex flex-col items-center text-center overflow-hidden z-10" id="hero-section">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute right-0 top-0 h-full w-full md:w-3/4 opacity-50 mix-blend-screen" style={{ WebkitMaskImage: "linear-gradient(to left, black 30%, transparent 100%)", maskImage: "linear-gradient(to left, black 30%, transparent 100%)" }}>
              <img alt="" className="w-full h-full object-cover object-right" src={BG_TREE} />
            </div>
          </div>
          <div className="relative z-10 max-w-container-max mx-auto px-margin-mobile md:px-gutter flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-border-subtle rounded-full mb-8 font-label-caps text-label-caps text-primary bg-surface-container-lowest/50 backdrop-blur-md animate-enter delay-100 shadow-[0_0_15px_rgba(225,45,51,0.2)]">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
              v1.0 · MCP + REST · bring your own key
            </div>
            <h1 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-text-primary mb-6 max-w-4xl animate-enter delay-200">
              The context layer <br className="hidden md:block" /> for any website
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-4xl mx-auto mb-10 animate-enter delay-300">
              Sixteen scraping and LLM tools behind one endpoint. Markdown, structured JSON, brand intel, design systems, fonts, products — from a single URL. You bring your own Groq key; we store nothing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto animate-enter delay-400">
              <button onClick={() => scrollTo("console")} className="bg-primary-container text-on-primary-container px-6 py-3 rounded-lg font-label-caps text-label-caps hover:bg-blood-red transition-colors w-full sm:w-auto shadow-[0_0_20px_rgba(225,45,51,0.4)]">Try it live</button>
              <a href={GH} target="_blank" rel="noreferrer" className="bg-surface/50 text-primary-container border border-border-subtle px-6 py-3 rounded-lg font-label-caps text-label-caps hover:bg-primary-container/20 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto backdrop-blur-sm">
                <Icon name="code" size={18} /> View source
              </a>
            </div>
          </div>
        </section>

        {/* Code Integration */}
        <section className="relative max-w-container-max mx-auto px-margin-mobile md:px-gutter pb-section-gap pt-16 z-10 overflow-hidden">
          <div className="absolute top-0 right-0 h-full w-full md:w-1/2 opacity-20 mix-blend-screen pointer-events-none" style={{ WebkitMaskImage: "radial-gradient(circle at top right, black 20%, transparent 80%)", maskImage: "radial-gradient(circle at top right, black 20%, transparent 80%)" }}>
            <img alt="" className="w-full h-full object-cover object-right-top" src={BG_TREE} />
          </div>
          <div className={sectionHead}>
            <span className={kicker}>Capabilities</span>
            <h2 className="font-headline-lg-mobile md:text-headline-lg text-text-primary mb-4">What you can build</h2>
            <p className="text-on-surface-variant font-body-md">Drop it into Claude Code or hit the REST endpoint directly. Real-time web context, three ways.</p>
          </div>
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-container/20 via-background to-blood-red/20 rounded-xl blur-xl opacity-50" />
            <div className="bg-surface-container-lowest/80 backdrop-blur-xl border border-border-subtle rounded-xl overflow-hidden relative shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <div className="bg-surface-container-low/90 px-4 py-2 border-b border-border-subtle flex justify-between items-center">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blood-red/60" />
                  <div className="w-3 h-3 rounded-full bg-primary-container/60" />
                  <div className="w-3 h-3 rounded-full bg-tertiary/60" />
                </div>
                <div className="flex gap-4">
                  {Object.keys(HERO_TABS).map((t) => (
                    <button key={t} onClick={() => setHeroTab(t)}
                      className={`font-label-caps text-[10px] transition-colors ${heroTab === t ? "text-primary" : "text-text-muted hover:text-primary"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6 font-code-sm text-code-sm relative">
                <button onClick={() => copy(HERO_TABS[heroTab], "hero")} className="absolute top-4 right-4 font-label-caps text-label-caps text-primary hover:text-tertiary transition-colors">
                  {copied === "hero" ? "copied" : "copy"}
                </button>
                <pre className="text-on-surface-variant overflow-x-auto"><code>{HERO_TABS[heroTab]}</code></pre>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="relative max-w-container-max mx-auto px-margin-mobile md:px-gutter pb-section-gap z-10 overflow-hidden" id="usecases">
          <div className="absolute inset-0 h-[600px] w-full md:w-3/4 opacity-[0.15] mix-blend-screen pointer-events-none -left-1/4 top-1/4" style={{ WebkitMaskImage: "radial-gradient(circle at left center, black 10%, transparent 60%)", maskImage: "radial-gradient(circle at left center, black 10%, transparent 60%)", transform: "scaleX(-1)" }}>
            <img alt="" className="w-full h-full object-cover object-left" src={BG_TREE} />
          </div>
          <div className="grid md:grid-cols-3 gap-gutter relative z-10">
            {USE_CASES.map((uc, i) => (
              <div key={i} className="bg-surface-muted/60 backdrop-blur-md border rounded-xl p-6 flex flex-col gap-4 card-hover relative border-primary-container/20 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-primary-container rounded-full border-4 border-background shadow-[0_0_10px_#e12d33]" />
                <div className="flex items-center gap-2 mb-2">
                  <Icon name={uc.icon} className="text-primary-container" />
                  <h3 className="font-label-caps text-label-caps text-primary">{uc.kicker}</h3>
                </div>
                <h4 className="font-headline-lg-mobile text-text-primary text-[20px]">{uc.title}</h4>
                <p className="text-on-surface-variant font-body-md text-sm mb-4">{uc.body}</p>
                <div className="bg-surface-container-lowest/80 border border-border-subtle rounded-lg p-3 font-code-sm text-[12px] text-on-surface-variant mb-2"><pre className="whitespace-pre-wrap"><code>{uc.req}</code></pre></div>
                <div className="bg-surface-container-lowest/80 border border-border-subtle rounded-lg p-3 font-code-sm text-[12px] text-tertiary mb-4"><pre className="whitespace-pre-wrap"><code>{uc.res}</code></pre></div>
                <button onClick={() => tryCase(uc)} className="text-primary-container font-label-caps text-label-caps flex items-center gap-1 hover:text-tertiary transition-colors mt-auto w-fit">
                  Try it <Icon name="arrow_forward" size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive Playground */}
        <section className="relative max-w-container-max mx-auto px-margin-mobile md:px-gutter pb-section-gap z-10 overflow-hidden" id="console">
          <div className="absolute inset-0 right-0 h-full w-full md:w-1/2 opacity-25 mix-blend-screen pointer-events-none translate-x-1/2" style={{ WebkitMaskImage: "radial-gradient(circle at center right, black 15%, transparent 70%)", maskImage: "radial-gradient(circle at center right, black 15%, transparent 70%)" }}>
            <img alt="" className="w-full h-full object-cover object-center" src={BG_TREE} />
          </div>
          <div className="mb-8 relative z-10">
            <span className={kicker}>Playground</span>
            <h2 className="font-headline-lg-mobile md:text-headline-lg text-text-primary mb-4">Run a tool now</h2>
            <p className="text-on-surface-variant font-body-md max-w-2xl">Live against production. AI tools need your Groq key — it stays in your browser and is sent only with the request.</p>
          </div>

          <div className="bg-surface-muted/70 backdrop-blur-xl border border-border-subtle rounded-xl p-6 grid gap-6 max-w-3xl mx-auto relative z-10 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            {/* groq key */}
            <div>
              <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <Icon name="key" size={14} /> groq api key{" "}
                  {groqKey && <span className="text-tertiary text-[10px] normal-case tracking-normal">● saved locally</span>}
                  {needsKey
                    ? <span className="text-primary-container text-[10px] normal-case tracking-normal">required for {tool.label}</span>
                    : <span className="text-text-muted text-[10px] normal-case tracking-normal">not needed for {tool.label}</span>}
                </span>
              </label>
              <input type="password" value={groqKey} onChange={(e) => saveKey(e.target.value)} autoComplete="off" spellCheck={false}
                placeholder="gsk_…  (free at console.groq.com/keys)"
                className="w-full bg-background/80 backdrop-blur-sm border border-border-subtle rounded-lg px-4 py-3 font-code-sm text-code-sm text-text-primary focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container transition-colors" />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-text-muted">Saved in your browser — survives refresh. Never sent to our server.</span>
                <a className="text-xs text-primary-container hover:text-tertiary" href="https://console.groq.com/keys" target="_blank" rel="noreferrer">Get a free key →</a>
              </div>
            </div>

            {/* url */}
            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">url</label>
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://stripe.com"
                className="w-full bg-background/80 backdrop-blur-sm border border-border-subtle rounded-lg px-4 py-3 font-code-sm text-code-sm text-text-primary focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container transition-colors" />
            </div>

            {/* command chips */}
            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">command</label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Tool selector">
                {TOOLS.map((t) => {
                  const active = tool.id === t.id;
                  return (
                    <button key={t.id} onClick={() => { setTool(t); setExtraVal(""); }} aria-pressed={active}
                      className={`px-2 py-1 rounded-lg text-xs font-code-sm cursor-pointer transition-colors flex items-center gap-1 ${
                        active
                          ? "bg-primary-container/20 border border-primary-container text-primary shadow-[0_0_10px_rgba(225,45,51,0.2)]"
                          : "bg-surface-container-low/80 border border-border-subtle text-on-surface-variant hover:border-primary-container backdrop-blur-sm"
                      }`}>
                      {t.label}
                      {LLM_TOOLS.has(t.id) && <span className="text-[9px] text-primary-container font-label-caps">AI</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* extra param */}
            {tool.needsExtra && (
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">{tool.needsExtra}</label>
                <input type="text" value={extraVal} onChange={(e) => setExtraVal(e.target.value)}
                  placeholder={tool.needsExtra === "question" ? "What does this company sell?" : '{"type":"object","properties":{"name":{"type":"string"}}}'}
                  className="w-full bg-background/80 backdrop-blur-sm border border-border-subtle rounded-lg px-4 py-3 font-code-sm text-code-sm text-text-primary focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container transition-colors" />
              </div>
            )}

            {/* run */}
            <div>
              <button onClick={run} disabled={loading || !url || (needsKey && !groqKey)}
                className="bg-primary-container text-on-primary-container px-6 py-3 rounded-lg font-label-caps text-label-caps hover:bg-blood-red transition-colors shadow-[0_0_15px_rgba(225,45,51,0.3)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 w-full sm:w-auto justify-center">
                {loading ? <><span className="spin"><Icon name="progress_activity" size={16} /></span> Running</> : <><Icon name="play_arrow" size={16} /> Run {tool.label}</>}
              </button>
              {needsKey && !groqKey && <div className="text-xs text-error mt-2">Add your Groq key above to run AI tools.</div>}
            </div>

            {error && (
              <div role="alert" className="bg-error-container/30 border border-error/40 text-on-error-container rounded-lg px-4 py-3 font-code-sm text-code-sm">
                {error}
              </div>
            )}

            {/* result */}
            {result && (() => {
              const isDesign = tool.id === "design_extract" && result.outputs;
              const OUTPUT_TABS = isDesign
                ? [
                    { id: "DESIGN.md", content: result.outputs.design_md, file: "DESIGN.md", mime: "text/markdown" },
                    { id: "Tailwind v4", content: result.outputs.tailwind, file: "tailwind.css", mime: "text/css" },
                    { id: "CSS Variables", content: result.outputs.css_variables, file: "variables.css", mime: "text/css" },
                    { id: "Design Tokens", content: JSON.stringify(result.outputs.design_tokens, null, 2), file: "design-tokens.json", mime: "application/json" },
                    { id: "Full JSON", content: JSON.stringify(result, null, 2), file: `${tool.id}-result.json`, mime: "application/json" },
                  ]
                : [{ id: "JSON", content: JSON.stringify(result, null, 2), file: `${tool.id}-result.json`, mime: "application/json" }];
              const active = OUTPUT_TABS.find((t) => t.id === outputTab) ?? OUTPUT_TABS[0];
              return (
                <div className="bg-surface-container-lowest/80 border border-border-subtle rounded-xl overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-2 border-b border-border-subtle bg-surface-container-low/80">
                    <span className="flex items-center gap-2 font-label-caps text-label-caps text-tertiary">
                      <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" /> 200 OK
                    </span>
                    <div className="flex gap-3 items-center">
                      <button onClick={() => copy(active.content, "result")} className="font-label-caps text-label-caps text-primary hover:text-tertiary transition-colors">{copied === "result" ? "copied" : "copy"}</button>
                      <button onClick={() => download(active.content, active.file, active.mime)} className="font-label-caps text-label-caps text-primary hover:text-tertiary transition-colors">↓ {active.id === "Full JSON" || active.id === "JSON" ? "json" : active.file}</button>
                    </div>
                  </div>
                  {isDesign && (
                    <div className="flex gap-4 px-4 py-2 border-b border-border-subtle overflow-x-auto">
                      {OUTPUT_TABS.map((t) => (
                        <button key={t.id} onClick={() => setOutputTab(t.id)}
                          className={`font-label-caps text-[10px] whitespace-nowrap transition-colors ${outputTab === t.id ? "text-primary" : "text-text-muted hover:text-primary"}`}>
                          {t.id}
                        </button>
                      ))}
                    </div>
                  )}
                  <pre className="p-4 font-code-sm text-[12px] text-on-surface-variant out-scroll whitespace-pre-wrap break-words"><code>{active.content}</code></pre>
                </div>
              );
            })()}
          </div>
        </section>

        {/* Connect */}
        <section className="relative max-w-container-max mx-auto px-margin-mobile md:px-gutter pb-section-gap z-10" id="connect">
          <div className="grid md:grid-cols-2 gap-gutter items-center relative z-10">
            <div>
              <span className={kicker}>Connect</span>
              <h2 className="font-headline-lg-mobile md:text-headline-lg text-text-primary mb-4">Wire it into Claude Code</h2>
              <p className="text-on-surface-variant font-body-md mb-6">
                Add to your MCP config. Your Groq key rides in the <code className="text-tertiary">x-groq-key</code> header — used per request, never stored.
              </p>
              <p className="text-on-surface-variant font-body-md border-l-2 border-primary-container pl-4">
                Raw HTTP? <code className="text-tertiary">POST /api/tools</code> with <code className="text-tertiary">{"{ command, url, ...params }"}</code> + header <code className="text-tertiary">x-groq-key</code>.
              </p>
            </div>
            <div className="bg-surface-muted/60 backdrop-blur-xl border border-border-subtle rounded-xl p-4 relative font-code-sm text-code-sm shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              <button onClick={() => copy(HERO_TABS.MCP, "config")} className="absolute top-4 right-4 font-label-caps text-label-caps text-primary hover:text-tertiary transition-colors">{copied === "config" ? "copied" : "copy"}</button>
              <pre className="mt-6 text-tertiary overflow-x-auto"><code>{HERO_TABS.MCP}</code></pre>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="relative max-w-container-max mx-auto px-margin-mobile md:px-gutter pb-section-gap z-10" id="faq">
          <div className="mb-8 relative z-10">
            <span className={kicker}>FAQ</span>
            <h2 className="font-headline-lg-mobile md:text-headline-lg text-text-primary">Keys, billing, hosting</h2>
          </div>
          <div className="max-w-3xl mx-auto flex flex-col gap-3 relative z-10">
            {FAQ.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={i} className={`bg-surface-muted/50 border rounded-lg overflow-hidden transition-colors ${open ? "border-primary-container/50" : "border-border-subtle"}`}>
                  <button onClick={() => setOpenFaq(open ? null : i)} aria-expanded={open}
                    className="w-full flex justify-between items-center text-left px-5 py-4 font-body-md text-text-primary hover:text-primary transition-colors">
                    {f.q}
                    <Icon name={open ? "expand_less" : "expand_more"} className="text-primary-container" />
                  </button>
                  {open && <div className="px-5 pb-4 text-on-surface-variant font-body-md text-sm">{f.a}</div>}
                </div>
              );
            })}
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative max-w-container-max mx-auto px-margin-mobile md:px-gutter pb-section-gap z-10 text-center">
          <div className="bg-surface-muted/60 backdrop-blur-xl border border-border-subtle rounded-xl p-12 relative z-10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <h2 className="font-headline-lg-mobile md:text-headline-lg text-text-primary mb-4">Start pulling context</h2>
            <p className="text-on-surface-variant font-body-md mb-8 max-w-xl mx-auto">Free Groq key, one endpoint, sixteen tools. No account, nothing stored.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => scrollTo("console")} className="bg-primary-container text-on-primary-container px-6 py-3 rounded-lg font-label-caps text-label-caps hover:bg-blood-red transition-colors shadow-[0_0_20px_rgba(225,45,51,0.4)]">Open the playground</button>
              <a href={GH} target="_blank" rel="noreferrer" className="bg-surface/50 text-primary-container border border-border-subtle px-6 py-3 rounded-lg font-label-caps text-label-caps hover:bg-primary-container/20 transition-colors flex items-center justify-center gap-2 backdrop-blur-sm">
                <Icon name="star" size={18} /> Star on GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest/90 backdrop-blur-md border-t border-border-subtle w-full py-stack-md px-margin-mobile md:px-gutter mt-20 relative z-10">
        <div className="max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-center gap-base">
          <div className="flex items-center gap-4">
            <span className="font-display-lg text-headline-lg text-text-primary">Context-MCP</span>
            <span className="text-on-surface-variant font-body-md text-sm">© 2026 Context-MCP. Precision context extraction for the LLM era.</span>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            <a className="font-label-caps text-label-caps text-text-muted hover:text-tertiary transition-colors" href={GH} target="_blank" rel="noreferrer">GitHub</a>
            <a className="font-label-caps text-label-caps text-text-muted hover:text-tertiary transition-colors" href="https://console.groq.com/keys" target="_blank" rel="noreferrer">Get a key</a>
            <button className="font-label-caps text-label-caps text-text-muted hover:text-tertiary transition-colors" onClick={() => scrollTo("faq")}>FAQ</button>
          </div>
        </div>
      </footer>
    </>
  );
}
