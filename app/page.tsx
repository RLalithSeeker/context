"use client";
import { useState } from "react";
import "./globals.css";

const TOOLS = [
  { id: "scrape_markdown", label: "📄 Scrape Markdown", needsExtra: false },
  { id: "scrape_html", label: "🔧 Scrape HTML", needsExtra: false },
  { id: "crawl", label: "🕸️ Crawl Website", needsExtra: false },
  { id: "extract_images", label: "🖼️ Extract Images", needsExtra: false },
  { id: "sitemap", label: "🗺️ Parse Sitemap", needsExtra: false },
  { id: "extract_structured", label: "🤖 AI Extract", needsExtra: "schema" },
  { id: "query", label: "💬 Query Page", needsExtra: "question" },
  { id: "product", label: "🛒 Product Data", needsExtra: false },
  { id: "brand", label: "🏢 Brand Intel", needsExtra: false },
  { id: "styleguide", label: "🎨 Style Guide", needsExtra: false },
  { id: "fonts", label: "🔤 Fonts", needsExtra: false },
  { id: "classify_naics", label: "📊 NAICS", needsExtra: false },
  { id: "classify_sic", label: "📊 SIC", needsExtra: false },
  { id: "logo", label: "🔗 Logo URL", needsExtra: false },
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [tool, setTool] = useState(TOOLS[0]);
  const [extraVal, setExtraVal] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Context-MCP
        </h1>
        <p className="text-gray-400 mt-1">15 web scraping tools. Paste a URL, pick a tool, get results.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">URL</label>
          <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Tool</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TOOLS.map(t => (
              <button key={t.id} onClick={() => { setTool(t); setExtraVal(""); }}
                className={`px-3 py-2 rounded-lg text-sm transition ${tool.id === t.id ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tool.needsExtra && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {tool.needsExtra === "question" ? "Question" : "JSON Schema"}
            </label>
            <input type="text" value={extraVal} onChange={e => setExtraVal(e.target.value)}
              placeholder={tool.needsExtra === "question" ? "What is this page about?" : '{"type":"object","properties":{"name":{"type":"string"}}}'}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500 font-mono text-sm" />
          </div>
        )}

        <button onClick={run} disabled={loading || !url}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition">
          {loading ? "⏳ Running..." : "🚀 Run"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">❌ {error}</div>
      )}

      {result && (
        <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
          <pre className="text-sm text-gray-300 overflow-auto whitespace-pre-wrap max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-400 space-y-2">
        <h3 className="text-gray-200 font-medium">Connect to Claude Code</h3>
        <p>Add this to your Claude config:</p>
        <pre className="bg-gray-900 p-3 rounded text-xs text-blue-300 overflow-x-auto">
{`{
  "mcpServers": {
    "context-mcp": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/client"],
      "url": "https://YOUR-VERCEL-URL.vercel.app/api/mcp",
      "env": { "GROQ_API_KEY": "gsk_..." }
    }
  }
}`}
        </pre>
        <p className="text-xs">Or use the REST API directly: <code className="text-blue-400">POST /api/tools</code> with <code className="text-blue-400">{"{ command, url, ...params }"}</code></p>
      </div>
    </div>
  );
}
