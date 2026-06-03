import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import * as tools from '@/lib/tools';
import { keyStore } from '@/lib/groq';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const transports = new Map<string, WebStandardStreamableHTTPServerTransport>();
let serverInstance: McpServer | null = null;

async function getServer(): Promise<McpServer> {
  if (serverInstance) return serverInstance;
  serverInstance = new McpServer({ name: 'Context-MCP', version: '1.0.0' });
  const s = serverInstance;

  s.tool('scrape_markdown',
    { url: z.string().url() },
    { readOnlyHint: true, openWorldHint: true },
    async ({ url }) => ({ content: [{ type: 'text' as const, text: JSON.stringify(await tools.cmd_scrape_markdown(url), null, 2) }] })
  );
  s.tool('scrape_html',
    { url: z.string().url(), selector: z.string().optional() },
    { readOnlyHint: true, openWorldHint: true },
    async ({ url, selector }) => ({ content: [{ type: 'text' as const, text: JSON.stringify(await tools.cmd_scrape_html(url, selector), null, 2) }] })
  );
  s.tool('crawl_website',
    { url: z.string().url(), maxPages: z.number().optional().default(20), maxDepth: z.number().optional().default(3) },
    { readOnlyHint: true, openWorldHint: true },
    async ({ url, maxPages, maxDepth }) => ({ content: [{ type: 'text' as const, text: JSON.stringify(await tools.cmd_crawl(url, maxPages, maxDepth), null, 2) }] })
  );
  s.tool('extract_images',
    { url: z.string().url() },
    { readOnlyHint: true, openWorldHint: true },
    async ({ url }) => ({ content: [{ type: 'text' as const, text: JSON.stringify(await tools.cmd_extract_images(url), null, 2) }] })
  );
  s.tool('crawl_sitemap',
    { url: z.string().url() },
    { readOnlyHint: true, openWorldHint: true },
    async ({ url }) => ({ content: [{ type: 'text' as const, text: JSON.stringify(await tools.cmd_sitemap(url), null, 2) }] })
  );
  s.tool('extract_structured',
    { url: z.string().url(), schema: z.string(), instruction: z.string().optional() },
    { readOnlyHint: true, openWorldHint: true },
    async ({ url, schema, instruction }) => ({ content: [{ type: 'text' as const, text: JSON.stringify(await tools.cmd_extract_structured(url, schema, instruction), null, 2) }] })
  );
  s.tool('query_website',
    { url: z.string().url(), question: z.string() },
    { readOnlyHint: true, openWorldHint: true },
    async ({ url, question }) => ({ content: [{ type: 'text' as const, text: JSON.stringify(await tools.cmd_query(url, question), null, 2) }] })
  );
  s.tool('extract_product',
    { url: z.string().url() },
    { readOnlyHint: true, openWorldHint: true },
    async ({ url }) => ({ content: [{ type: 'text' as const, text: JSON.stringify(await tools.cmd_product(url), null, 2) }] })
  );
  s.tool('get_brand',
    { url: z.string().url() },
    { readOnlyHint: true, openWorldHint: true },
    async ({ url }) => ({ content: [{ type: 'text' as const, text: JSON.stringify(await tools.cmd_brand(url), null, 2) }] })
  );
  s.tool('get_styleguide',
    { url: z.string().url() },
    { readOnlyHint: true, openWorldHint: true },
    async ({ url }) => ({ content: [{ type: 'text' as const, text: JSON.stringify(await tools.cmd_styleguide(url), null, 2) }] })
  );
  s.tool('get_fonts',
    { url: z.string().url() },
    { readOnlyHint: true, openWorldHint: true },
    async ({ url }) => ({ content: [{ type: 'text' as const, text: JSON.stringify(await tools.cmd_fonts(url), null, 2) }] })
  );
  s.tool('classify_naics',
    { url: z.string().url() },
    { readOnlyHint: true, openWorldHint: true },
    async ({ url }) => ({ content: [{ type: 'text' as const, text: JSON.stringify(await tools.cmd_classify_naics(url), null, 2) }] })
  );
  s.tool('classify_sic',
    { url: z.string().url() },
    { readOnlyHint: true, openWorldHint: true },
    async ({ url }) => ({ content: [{ type: 'text' as const, text: JSON.stringify(await tools.cmd_classify_sic(url), null, 2) }] })
  );
  s.tool('enrich_transaction',
    { descriptor: z.string(), amount: z.number().optional() },
    { readOnlyHint: true, openWorldHint: false },
    async ({ descriptor, amount }) => ({ content: [{ type: 'text' as const, text: JSON.stringify(await tools.cmd_transaction(descriptor, amount), null, 2) }] })
  );
  s.tool('get_logo_url',
    { url: z.string().url() },
    { readOnlyHint: true, openWorldHint: true },
    async ({ url }) => ({ content: [{ type: 'text' as const, text: JSON.stringify(await tools.cmd_logo(url), null, 2) }] })
  );

  return serverInstance;
}

async function getTransport(request: Request): Promise<WebStandardStreamableHTTPServerTransport> {
  const server = await getServer();
  const sessionId = request.headers.get('mcp-session-id') || generateUUID();
  let transport = transports.get(sessionId);
  if (!transport) {
    transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
    });
    transports.set(sessionId, transport);
    await server.connect(transport);
  }
  return transport;
}

export async function POST(request: Request) {
  try {
    // Bring-your-own-key: caller's Groq key (header) is scoped to this request only.
    const apiKey = request.headers.get('x-groq-key') || '';
    return await keyStore.run(apiKey, async () => {
      const transport = await getTransport(request);
      return await transport.handleRequest(request);
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export async function GET(request: Request) {
  const sessionId = request.headers.get('mcp-session-id');
  if (!sessionId || !transports.has(sessionId)) return new Response('Not found', { status: 404 });
  try {
    return await transports.get(sessionId)!.handleRequest(request);
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const sessionId = request.headers.get('mcp-session-id');
  if (sessionId && transports.has(sessionId)) {
    await transports.get(sessionId)!.close();
    transports.delete(sessionId);
  }
  return new Response(null, { status: 200 });
}
