"use client";
import { useState } from "react";
import "./globals.css";
import Mesh from "./Mesh";
import { ICONS, Rocket, Github, Bolt } from "./icons";

const MCP_URL = "https://context-mcp-psi.vercel.app/api/mcp";

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
  { id: "fonts", label: "fonts" },
  { id: "classify_naics", label: "naics" },
  { id: "classify_sic", label: "sic" },
  { id: "transaction", label: "transaction" },
  { id: "logo", label: "logo" },
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
  const [tool, setTool] = useState<Tool>(TOOLS[8]); // brand — good demo default
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

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <nav className="nav">
        <div className="brand"><span className="mark">{Bolt}</span> Context<span style={{ color: "var(--fg-faint)" }}>·</span>MCP</div>
        <div className="nav-links">
          <a className="nav-link" href="/api/tools">REST</a>
          <button className="nav-link" onClick={() => scrollTo("connect")} style={{ background: "none", cursor: "pointer", font: "inherit" }}>Docs</button>
          <a className="nav-link gh" href="https://github.com/RLalithSeeker/context" target="_blank" rel="noreferrer" aria-label="GitHub">
            {Github} Star
          </a>
        </div>
      </nav>

      <div className="wrap">
        <section className="hero">
          <Mesh />
          <div className="hero-inner">
            <span className="eyebrow"><span className="live" /> v1.0 · MCP Streamable HTTP + REST</span>
            <h1>The context layer<br />for any website</h1>
            <p className="sub">Fifteen scraping and LLM tools behind one MCP endpoint. Markdown, structured JSON, brand intel, fonts, product data — from a single URL.</p>
            <div className="cta-row">
              <a className="btn-secondary" style={{ background: "var(--accent)", color: "#04140a", border: "none" }} onClick={() => scrollTo("console")} href="#console">{Rocket} Try it live</a>
              <a className="btn-secondary" href="https://github.com/RLalithSeeker/context" target="_blank" rel="noreferrer">{Github} View source</a>
            </div>
          </div>

          <div className="terminal" aria-hidden="true">
            <div className="terminal-bar">
              <span className="d" /><span className="d" /><span className="d" />
              <span className="t">context-mcp · brand</span>
            </div>
            <pre>
{`$ `}<span className="c-prompt">curl</span>{` -X POST `}<span className="c-dim">.../api/tools</span>{` \\
    `}<span className="c-flag">-d</span>{` `}<span className="c-str">{'\'{"command":"brand","url":"stripe.com"}\''}</span>{`

{
  `}<span className="c-key">"name"</span>{`:     `}<span className="c-str">"Stripe"</span>{`,
  `}<span className="c-key">"industry"</span>{`: `}<span className="c-str">"Financial infrastructure"</span>{`,
  `}<span className="c-key">"colors"</span>{`:   [`}<span className="c-str">"#635bff"</span>{`, `}<span className="c-str">"#0a2540"</span>{`],
  `}<span className="c-key">"fonts"</span>{`:    [`}<span className="c-str">"Sohne"</span>{`, `}<span className="c-str">"Söhne Mono"</span>{`]
}`}
            </pre>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <div className="kicker">How it works</div>
            <h2>One call. Clean context.</h2>
          </div>
          <div className="steps">
            <div className="step">
              <div className="n">01</div>
              <h3>Point at a URL</h3>
              <p>Pass any public webpage. No API keys for scraping, no headless browser to manage.</p>
            </div>
            <div className="step">
              <div className="n">02</div>
              <h3>Pick a tool</h3>
              <p>Fifteen commands — raw scrape, crawl, or Groq-powered extraction into typed JSON.</p>
            </div>
            <div className="step">
              <div className="n">03</div>
              <h3>Get structured data</h3>
              <p>Same response over MCP for agents or plain REST for code. Deterministic shapes.</p>
            </div>
          </div>
        </section>

        <section className="section" id="console">
          <div className="section-head">
            <div className="kicker">Playground</div>
            <h2>Run a tool now</h2>
            <p>Live against the production endpoint. Pick a command, drop a URL, hit run.</p>
          </div>

          <div className="console">
            <div className="console-body">
              <div className="field">
                <label className="label" htmlFor="url">url</label>
                <input id="url" className="input mono" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://stripe.com" />
              </div>

              <div className="field">
                <label className="label">command</label>
                <div className="tools" role="group" aria-label="Tool selector">
                  {TOOLS.map(t => (
                    <button key={t.id} onClick={() => { setTool(t); setExtraVal(""); }}
                      aria-pressed={tool.id === t.id}
                      className={`tool${tool.id === t.id ? " active" : ""}`}>
                      {ICONS[t.id]} {t.label}
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
                <button className="btn" onClick={run} disabled={loading || !url}>
                  {loading ? <><span className="spin">{Rocket}</span> Running</> : <>{Rocket} Run {tool.label}</>}
                </button>
              </div>

              {error && <div className="error" role="alert">{error}</div>}

              {result && (
                <div className="result">
                  <div className="result-head">
                    <span className="tag"><span className="live" /> 200 OK</span>
                    <button className="btn-ghost" onClick={() => copy(JSON.stringify(result, null, 2), "result")}>
                      {copied === "result" ? "copied" : "copy json"}
                    </button>
                  </div>
                  <pre className="out">{JSON.stringify(result, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="section" id="connect">
          <div className="section-head">
            <div className="kicker">Connect</div>
            <h2>Wire it into Claude Code</h2>
            <p>Add to your MCP config. Proxies over <code style={{ fontFamily: "var(--mono)", fontSize: "var(--t-xs)" }}>mcp-remote</code> — no local install.</p>
          </div>
          <div className="code-block">
            <button className="btn-ghost copy" onClick={() => copy(CONFIG, "config")}>
              {copied === "config" ? "copied" : "copy"}
            </button>
            <pre className="code">{CONFIG}</pre>
          </div>
          <p className="hint" style={{ marginTop: "var(--s4)", marginBottom: 0 }}>
            Raw HTTP? <code>POST /api/tools</code> with <code>{"{ command, url, ...params }"}</code>.
          </p>
        </section>

        <footer className="footer">
          <span>Context-MCP — Next.js · Groq · MCP</span>
          <span className="mono">
            motion <a href="https://robonuggets.com" target="_blank" rel="noreferrer">RoboLabs</a> · <a href="https://github.com/RLalithSeeker/context" target="_blank" rel="noreferrer">github</a>
          </span>
        </footer>
      </div>
    </>
  );
}
