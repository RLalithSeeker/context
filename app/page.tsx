"use client";
import { useState } from "react";
import "./globals.css";

const MCP_URL = "https://context-mcp-psi.vercel.app/api/mcp";

type Tool = { id: string; label: string; ico: string; needsExtra?: "question" | "schema" };

const TOOLS: Tool[] = [
  { id: "scrape_markdown", label: "Scrape Markdown", ico: "📄" },
  { id: "scrape_html", label: "Scrape HTML", ico: "🔧" },
  { id: "crawl", label: "Crawl Site", ico: "🕸️" },
  { id: "extract_images", label: "Extract Images", ico: "🖼️" },
  { id: "sitemap", label: "Parse Sitemap", ico: "🗺️" },
  { id: "extract_structured", label: "AI Extract", ico: "🤖", needsExtra: "schema" },
  { id: "query", label: "Query Page", ico: "💬", needsExtra: "question" },
  { id: "product", label: "Product Data", ico: "🛒" },
  { id: "brand", label: "Brand Intel", ico: "🏢" },
  { id: "styleguide", label: "Style Guide", ico: "🎨" },
  { id: "fonts", label: "Fonts", ico: "🔤" },
  { id: "classify_naics", label: "NAICS Code", ico: "📊" },
  { id: "classify_sic", label: "SIC Code", ico: "📈" },
  { id: "transaction", label: "Txn Enrich", ico: "💳" },
  { id: "logo", label: "Logo URL", ico: "🔗" },
];

const CONFIG = `{
  "mcpServers": {
    "context-mcp": {
      "command": "npx",
      "args": ["-y", "mcp-remote@latest", "${MCP_URL}"]
    }
  }
}`;

export default function Home() {
  const [url, setUrl] = useState("");
  const [tool, setTool] = useState<Tool>(TOOLS[0]);
  const [extraVal, setExtraVal] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 1600);
    });
  }

  async function run() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const body: any = { command: tool.id, url };
      if (tool.needsExtra === "question" && extraVal) body.question = extraVal;
      if (tool.needsExtra === "schema" && extraVal) body.schema = extraVal;
      const resp = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <nav className="nav">
        <div className="brand"><span className="dot" /> Context-MCP</div>
        <div className="nav-links">
          <a className="nav-link" href="/api/tools">REST API</a>
          <a className="nav-link primary" href="https://github.com/RLalithSeeker/context" target="_blank" rel="noreferrer">★ GitHub</a>
        </div>
      </nav>

      <div className="wrap">
        <header className="hero">
          <span className="pill"><span className="live" /> Live · MCP Streamable HTTP</span>
          <h1>Turn any website into<br /><span className="grad">structured context</span></h1>
          <p>15 web-scraping &amp; LLM tools behind one MCP endpoint. Paste a URL, pick a tool, get clean data — markdown, products, brand intel, fonts, and more.</p>
          <div className="stats">
            <div className="stat"><b>15</b><span>Tools</span></div>
            <div className="stat"><b>MCP</b><span>Streamable HTTP</span></div>
            <div className="stat"><b>REST</b><span>JSON API</span></div>
            <div className="stat"><b>Groq</b><span>LLM Engine</span></div>
          </div>
        </header>

        <section className="card">
          <div className="card-head"><span className="num">1</span><h2>Try it live</h2></div>

          <div className="field">
            <label className="label">Target URL</label>
            <input className="input" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" />
          </div>

          <div className="field">
            <label className="label">Pick a tool</label>
            <div className="tools">
              {TOOLS.map(t => (
                <button key={t.id} onClick={() => { setTool(t); setExtraVal(""); }}
                  className={`tool${tool.id === t.id ? " active" : ""}`}>
                  <span className="ico">{t.ico}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          {tool.needsExtra && (
            <div className="field">
              <label className="label">{tool.needsExtra === "question" ? "Question" : "JSON Schema"}</label>
              <input className="input mono" type="text" value={extraVal} onChange={e => setExtraVal(e.target.value)}
                placeholder={tool.needsExtra === "question" ? "What is this page about?" : '{"type":"object","properties":{"name":{"type":"string"}}}'} />
            </div>
          )}

          <button className="btn" onClick={run} disabled={loading || !url}>
            {loading ? <><span className="spin">⏳</span> Running…</> : <>🚀 Run {tool.label}</>}
          </button>

          {error && <div className="error">❌ {error}</div>}

          {result && (
            <div className="result">
              <div className="result-head">
                <span className="tag"><span className="live" /> Result</span>
                <button className="btn-ghost" onClick={() => copy(JSON.stringify(result, null, 2), "result")}>
                  {copied === "result" ? "✓ Copied" : "Copy JSON"}
                </button>
              </div>
              <pre className="out">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-head"><span className="num">2</span><h2>Connect to Claude Code</h2></div>
          <p className="hint">Add this to your MCP config (<code>~/.claude.json</code> or your client&apos;s settings). It proxies over <code>mcp-remote</code>.</p>
          <div className="code-block">
            <button className="btn-ghost copy" onClick={() => copy(CONFIG, "config")}>
              {copied === "config" ? "✓ Copied" : "Copy"}
            </button>
            <pre className="code">{CONFIG}</pre>
          </div>
          <p className="hint" style={{ marginTop: 16, marginBottom: 0 }}>
            Prefer raw HTTP? Hit <code>POST /api/tools</code> with <code>{"{ command, url, ...params }"}</code>.
          </p>
        </section>

        <footer className="footer">
          Built with Next.js · Groq · MCP — <a href="https://github.com/RLalithSeeker/context" target="_blank" rel="noreferrer">github.com/RLalithSeeker/context</a>
        </footer>
      </div>
    </>
  );
}
