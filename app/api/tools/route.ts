import { NextRequest, NextResponse } from 'next/server';
import * as tools from '@/lib/tools';
import { keyStore } from '@/lib/groq';

const TOOL_MAP: Record<string, Function> = {
  scrape_markdown: tools.cmd_scrape_markdown,
  scrape_html: tools.cmd_scrape_html,
  crawl: tools.cmd_crawl,
  extract_images: tools.cmd_extract_images,
  sitemap: tools.cmd_sitemap,
  extract_structured: tools.cmd_extract_structured,
  query: tools.cmd_query,
  product: tools.cmd_product,
  brand: tools.cmd_brand,
  styleguide: tools.cmd_styleguide,
  design_extract: tools.cmd_design_extract,
  fonts: tools.cmd_fonts,
  classify_naics: tools.cmd_classify_naics,
  classify_sic: tools.cmd_classify_sic,
  transaction: tools.cmd_transaction,
  logo: tools.cmd_logo,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, url, apiKey: bodyKey, ...params } = body;
    // Bring-your-own-key: header preferred, body fallback. Used only for this request, never stored/logged.
    const apiKey = request.headers.get('x-groq-key') || bodyKey || '';
    if (!command || !TOOL_MAP[command]) {
      return NextResponse.json({ error: `Unknown command`, available: Object.keys(TOOL_MAP) }, { status: 400 });
    }
    if (command !== 'transaction' && !url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    const fn = TOOL_MAP[command];
    const result = await keyStore.run(apiKey, () =>
      command === 'transaction'
        ? fn(params.descriptor, params.amount)
        : command === 'query'
        ? fn(url, params.question)
        : command === 'extract_structured'
        ? fn(url, params.schema, params.instruction)
        : command === 'scrape_html'
        ? fn(url, params.selector)
        : command === 'crawl'
        ? fn(url, params.maxPages, params.maxDepth)
        : fn(url)
    );
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ tools: Object.keys(TOOL_MAP) });
}
