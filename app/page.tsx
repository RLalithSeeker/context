"use client";
import { useState, useEffect } from "react";
import "./globals.css";
import Mesh from "./Mesh";
import { ICONS, Rocket, Github, Bolt, Key, Chevron, Arrow, Terminal, Layers, Search } from "./icons";

const BASE = "https://context-mcp-psi.vercel.app";
const MCP_URL = `${BASE}/api/mcp`;

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

const LLM_TOOLS = new Set(["extract_structured", "query", "product", "brand", "styleguide", "design_extract", "classify_naics", "classify_sic", "transaction"]);

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

type UseCase = { icon: any; kicker: string; title: string; body: string; req: string; res: string; tool: string; url: string };
const USE_CASES: UseCase[] = [
  {
    icon: Terminal, kicker: "AI Agent Web Access", title: "Give agents eyes on the live web",
    body: "Let any MCP agent read and reason over real pages in real time — scrape to clean markdown, no headless browser to babysit.",
    req: `POST /api/tools\n{ "command": "scrape_markdown",\n  "url": "vercel.com/pricing" }`,
    res: `# Vercel Pricing\nHobby — $0/mo\nPro — $20/mo …`,
    tool: "scrape_markdown", url: "https://vercel.com/pricing",
  },
  {
    icon: Layers, kicker: "RAG & Knowledge Pipelines", title: "Feed your LLM up-to-date context",
    body: "Crawl a sitemap, extract structured markdown, and pipe clean, current web content straight into your knowledge base.",
    req: `POST /api/tools\n{ "command": "crawl",\n  "url": "docs.python.org" }`,
    res: `{ "pages_crawled": 20,\n  "pages": [{ "title": …,\n    "markdown": … }] }`,
    tool: "crawl", url: "https://docs.python.org",
  },
  {
    icon: Search, kicker: "Research & Enrichment", title: "Resolve a domain into a typed company",
    body: "Turn any URL into structured firmographics — name, industry, colors, fonts, socials — for CRM enrichment and lead scoring.",
    req: `POST /api/tools\n{ "command": "brand",\n  "url": "stripe.com" }`,
    res: `{ "company_name": "Stripe",\n  "industry": "Finance",\n  "colors": ["#635bff", …] }`,
    tool: "brand", url: "https://stripe.com",
  },
];

const FAQ: { q: string; a: string }[] = [
  { q: "Do I need a Groq API key?", a: "Only for the 8 AI tools (extract, query, product, brand, styleguide, naics, sic, transaction). The 7 scraping tools — scrape, html, crawl, sitemap, images, fonts, logo — need no key at all." },
  { q: "Is my key stored anywhere?", a: "No. Your key is used for that single request to Groq and never persisted or logged on the server. In the playground it lives only in your browser's localStorage — clear it any time." },
  { q: "Whose key runs the AI tools?", a: "Yours. The server holds no Groq key of its own, so you're never billed for someone else's traffic and we're never billed for yours. Get a free key at console.groq.com/keys." },
  { q: "How do I pass the key?", a: "REST: x-groq-key header (or apiKey in the JSON body). MCP: add --header \"x-groq-key:$GROQ_KEY\" to the mcp-remote args, as shown in the Connect section." },
  { q: "Can I self-host?", a: "Yes — it's a standard Next.js app. Clone the repo, deploy to Vercel (or anywhere), done. Source is on GitHub." },
];

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

  useEffect(() => {
    try { const k = localStorage.getItem("groq_key"); if (k) setGroqKey(k); } catch {}
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
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }
  function tryCase(uc: UseCase) {
    const t = TOOLS.find(x => x.id === uc.tool)!;
    setTool(t); setUrl(uc.url); setExtraVal(""); setResult(null); setError("");
    scrollTo("console");
  }

  const needsKey = LLM_TOOLS.has(tool.id);

  return (
    <>
      <nav className="nav">
        <div className="brand"><span className="mark">{Bolt}</span> Context<span style={{ color: "var(--fg-faint)" }}>·</span>MCP</div>
        <div className="nav-links">
          <button className="nav-link" onClick={() => scrollTo("usecases")} style={{ background: "none", cursor: "pointer", font: "inherit" }}>Use cases</button>
          <button className="nav-link" onClick={() => scrollTo("connect")} style={{ background: "none", cursor: "pointer", font: "inherit" }}>Docs</button>
          <a className="nav-link gh" href="https://github.com/RLalithSeeker/context" target="_blank" rel="noreferrer" aria-label="GitHub">{Github} Star</a>
        </div>
      </nav>

      <div className="wrap">
        {/* HERO */}
        <section className="hero">
          <Mesh />
          <div className="hero-inner">
            <span className="eyebrow"><span className="live" /> v1.0 · MCP + REST · bring your own key</span>
            <h1>The context layer<br />for any website</h1>
            <p className="sub">Sixteen scraping and LLM tools behind one endpoint. Markdown, structured JSON, brand intel, design systems, fonts, products — from a single URL. You bring your own Groq key; we store nothing.</p>
            <div className="cta-row">
              <a className="btn-primary-link" onClick={() => scrollTo("console")} href="#console">{Rocket} Try it live</a>
              <a className="btn-secondary" href="https://github.com/RLalithSeeker/context" target="_blank" rel="noreferrer">{Github} View source</a>
            </div>
          </div>

          <div className="code-tabs">
            <div className="tabbar">
              {Object.keys(HERO_TABS).map(t => (
                <button key={t} className={`tab${heroTab === t ? " active" : ""}`} onClick={() => setHeroTab(t)}>{t}</button>
              ))}
              <button className="tab-copy" onClick={() => copy(HERO_TABS[heroTab], "hero")}>{copied === "hero" ? "copied" : "copy"}</button>
            </div>
            <pre className="tabpanel">{HERO_TABS[heroTab]}</pre>
          </div>
        </section>

        {/* USE CASES */}
        <section className="section" id="usecases">
          <div className="section-head">
            <div className="kicker">What you can build</div>
            <h2>Real-time web context, three ways</h2>
            <p>Every block runs against the live endpoint. Hit “try it” to load it into the playground.</p>
          </div>
          <div className="usecases">
            {USE_CASES.map((uc, i) => (
              <div className="usecase" key={i}>
                <div className="uc-icon">{uc.icon}</div>
                <div className="uc-kicker">{uc.kicker}</div>
                <h3>{uc.title}</h3>
                <p>{uc.body}</p>
                <div className="uc-demo">
                  <pre className="uc-req">{uc.req}</pre>
                  <div className="uc-arrow">{Arrow}</div>
                  <pre className="uc-res">{uc.res}</pre>
                </div>
                <button className="uc-try" onClick={() => tryCase(uc)}>Try it {Arrow}</button>
              </div>
            ))}
          </div>
        </section>

        {/* PLAYGROUND */}
        <section className="section" id="console">
          <div className="section-head">
            <div className="kicker">Playground</div>
            <h2>Run a tool now</h2>
            <p>Live against production. AI tools need your Groq key — it stays in your browser and is sent only with the request.</p>
          </div>

          <div className="console">
            <div className="console-body">
              <div className="field">
                <label className="label" htmlFor="key">{Key} groq api key {groqKey && <span className="opt">● saved locally</span>} {needsKey ? <span className="req">required for {tool.label}</span> : <span className="opt">not needed for {tool.label}</span>}</label>
                <input id="key" className="input mono" type="password" value={groqKey} onChange={e => saveKey(e.target.value)}
                  placeholder="gsk_…  (get one free at console.groq.com/keys)" autoComplete="off" spellCheck={false} />
                <div className="key-note">Saved in your browser — survives refresh. Never sent to our server. <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">Get a free key →</a></div>
              </div>

              <div className="field">
                <label className="label" htmlFor="url">url</label>
                <input id="url" className="input mono" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://stripe.com" />
              </div>

              <div className="field">
                <label className="label">command</label>
                <div className="tools" role="group" aria-label="Tool selector">
                  {TOOLS.map(t => (
                    <button key={t.id} onClick={() => { setTool(t); setExtraVal(""); }} aria-pressed={tool.id === t.id}
                      className={`tool${tool.id === t.id ? " active" : ""}`}>
                      {ICONS[t.id]} {t.label}{LLM_TOOLS.has(t.id) && <span className="ai-dot" title="needs Groq key">AI</span>}
                    </button>
                  ))}
                </div>
              </div>

              {tool.needsExtra && (
                <div className="field">
                  <label className="label" htmlFor="extra">{tool.needsExtra === "question" ? "question" : "schema"}</label>
                  <input id="extra" className="input mono" type="text" value={extraVal} onChange={e => setExtraVal(e.target.value)}
                    placeholder={tool.needsExtra === "question" ? "What does this company sell?" : '{"type":"object","properties":{"name":{"type":"string"}}}'} />
                </div>
              )}

              <div className="btn-run-wrap">
                <button className="btn" onClick={run} disabled={loading || !url || (needsKey && !groqKey)}>
                  {loading ? <><span className="spin">{Rocket}</span> Running</> : <>{Rocket} Run {tool.label}</>}
                </button>
                {needsKey && !groqKey && <div className="key-warn">Add your Groq key above to run AI tools.</div>}
              </div>

              {error && <div className="error" role="alert">{error}</div>}

              {result && (
                <div className="result">
                  <div className="result-head">
                    <span className="tag"><span className="live" /> 200 OK</span>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      {tool.id === "design_extract" && result.outputs?.design_md && (
                        <button className="btn-ghost" onClick={() => download(result.outputs.design_md, "DESIGN.md", "text/markdown")}>↓ DESIGN.md</button>
                      )}
                      {tool.id === "design_extract" && result.outputs?.design_tokens && (
                        <button className="btn-ghost" onClick={() => download(JSON.stringify(result.outputs.design_tokens, null, 2), "design-tokens.json", "application/json")}>↓ tokens.json</button>
                      )}
                      <button className="btn-ghost" onClick={() => download(JSON.stringify(result, null, 2), `${tool.id}-result.json`, "application/json")}>↓ JSON</button>
                      <button className="btn-ghost" onClick={() => copy(JSON.stringify(result, null, 2), "result")}>{copied === "result" ? "copied" : "copy"}</button>
                    </div>
                  </div>
                  <pre className="out">{JSON.stringify(result, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CONNECT */}
        <section className="section" id="connect">
          <div className="section-head">
            <div className="kicker">Connect</div>
            <h2>Wire it into Claude Code</h2>
            <p>Add to your MCP config. Your Groq key rides in the <code className="ic">x-groq-key</code> header — used per request, never stored.</p>
          </div>
          <div className="code-block">
            <button className="btn-ghost copy" onClick={() => copy(HERO_TABS.MCP, "config")}>{copied === "config" ? "copied" : "copy"}</button>
            <pre className="code">{HERO_TABS.MCP}</pre>
          </div>
          <p className="hint" style={{ marginTop: "var(--s4)", marginBottom: 0 }}>
            Raw HTTP? <code>POST /api/tools</code> with <code>{"{ command, url, ...params }"}</code> + header <code>x-groq-key</code>.
          </p>
        </section>

        {/* FAQ */}
        <section className="section" id="faq">
          <div className="section-head">
            <div className="kicker">FAQ</div>
            <h2>Keys, billing, hosting</h2>
          </div>
          <div className="faq">
            {FAQ.map((f, i) => (
              <div className={`faq-item${openFaq === i ? " open" : ""}`} key={i}>
                <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                  {f.q} <span className="faq-chev">{Chevron}</span>
                </button>
                {openFaq === i && <div className="faq-a">{f.a}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="cta-block">
          <h2>Start pulling context</h2>
          <p>Free Groq key, one endpoint, sixteen tools. No account, nothing stored.</p>
          <div className="cta-row">
            <a className="btn-primary-link" onClick={() => scrollTo("console")} href="#console">{Rocket} Open the playground</a>
            <a className="btn-secondary" href="https://github.com/RLalithSeeker/context" target="_blank" rel="noreferrer">{Github} Star on GitHub</a>
          </div>
        </section>

        <footer className="footer">
          <span>Context-MCP — Next.js · Groq · MCP</span>
          <span className="mono">motion <a href="https://robonuggets.com" target="_blank" rel="noreferrer">RoboLabs</a> · <a href="https://github.com/RLalithSeeker/context" target="_blank" rel="noreferrer">github</a></span>
        </footer>
      </div>
    </>
  );
}
