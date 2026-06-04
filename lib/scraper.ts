import * as cheerio from 'cheerio'
import TurndownService from 'turndown'

const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Cache-Control': 'no-cache',
}

export async function fetchPage(url: string): Promise<{
  html: string
  css: string
  title: string
  markdownContent: string
  metaTags: Record<string, string>
  ogImage: string | null
}> {
  const response = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(15000),
    redirect: 'follow',
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  const html = await response.text()
  const $ = cheerio.load(html)

  const title = $('title').text().trim() || $('h1').first().text().trim() || ''

  const metaTags: Record<string, string> = {}
  $('meta').each((_, el) => {
    const name = $(el).attr('name') || $(el).attr('property') || ''
    const content = $(el).attr('content') || ''
    if (name && content) metaTags[name] = content
  })

  const ogImage = metaTags['og:image'] || metaTags['twitter:image'] || null

  // Inline styles
  const inlineCSS: string[] = []
  $('style').each((_, el) => {
    const text = $(el).text()
    if (text.length > 20) inlineCSS.push(text)
  })

  // External CSS links
  const cssLinks: string[] = []
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href')
    if (href && cssLinks.length < 6) {
      try {
        cssLinks.push(new URL(href, url).href)
      } catch {}
    }
  })

  // Fetch external CSS
  const externalCSS: string[] = []
  const fetches = cssLinks.slice(0, 4).map(async (link) => {
    try {
      const r = await fetch(link, {
        headers: { 'User-Agent': HEADERS['User-Agent'] },
        signal: AbortSignal.timeout(8000),
      })
      if (r.ok) {
        const text = await r.text()
        externalCSS.push(text.slice(0, 25000))
      }
    } catch {}
  })
  await Promise.all(fetches)

  const css = [...inlineCSS, ...externalCSS].join('\n').slice(0, 90000)

  // Convert to markdown for brand/content extraction
  $('script, style, noscript, svg, iframe, img').remove()
  const bodyHtml = $('body').html() || html
  const markdownContent = td.turndown(bodyHtml).slice(0, 10000)

  return { html, css, title, markdownContent, metaTags, ogImage }
}
