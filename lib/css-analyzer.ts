// Frequency-based CSS design token extractor — no LLM for token values.
// Mirrors design-extractor.com's "CSSOM frequency analysis" approach.

export interface ColorToken {
  name: string
  hex: string
  usage: string
  frequency: number
  group: 'neutrals' | 'brand' | 'semantic'
  cssVar?: string
}

export interface TypeScale {
  role: string
  size: string
  weight?: number
}

export interface AnalyzedDesign {
  method: 'frequency-analysis'
  design_system_detected: string | null
  colors: ColorToken[]
  typography: {
    font_families: string[]
    font_weights: number[]
    type_scale: TypeScale[]
    line_heights: string[]
    font_sources: string[]
  }
  spacing: {
    base_unit: string
    scale: number[]
    named: { name: string; value: string }[]
  }
  border_radius: {
    values: string[]
    named: { name: string; value: string }[]
  }
  shadows: string[]
  breakpoints: { name: string; value: string }[]
  transitions: { durations: string[]; easing: string[] }
}

// ── Color utilities ──

function normalizeHex(raw: string): string | null {
  const c = raw.replace('#', '').toLowerCase()
  if (/^[0-9a-f]{3}$/.test(c)) return '#' + c[0]+c[0]+c[1]+c[1]+c[2]+c[2]
  if (/^[0-9a-f]{6}$/.test(c)) return '#' + c
  if (/^[0-9a-f]{8}$/.test(c)) return '#' + c.slice(0, 6) // strip alpha
  return null
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const c = hex.replace('#', '')
  if (c.length !== 6) return null
  const r = parseInt(c.slice(0,2),16)/255, g = parseInt(c.slice(2,4),16)/255, b = parseInt(c.slice(4,6),16)/255
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min
  let h = 0, s = 0
  const l = (max+min)/2
  if (d !== 0) {
    s = l > 0.5 ? d/(2-max-min) : d/(max+min)
    switch(max) {
      case r: h = ((g-b)/d + (g<b?6:0))/6; break
      case g: h = ((b-r)/d+2)/6; break
      case b: h = ((r-g)/d+4)/6; break
    }
  }
  return { h: h*360, s: s*100, l: l*100 }
}

function colorGroup(hex: string): ColorToken['group'] {
  const hsl = hexToHsl(hex)
  if (!hsl) return 'neutrals'
  const { h, s, l } = hsl
  if (s < 12) return 'neutrals'
  if (l > 93 || l < 7) return 'neutrals'
  // Semantic: green=success, red=error, yellow=warning
  if (h >= 95 && h < 155 && s > 30) return 'semantic'
  if ((h < 15 || h >= 345) && s > 40) return 'semantic'
  if (h >= 45 && h < 65 && s > 40 && l > 40) return 'semantic'
  return 'brand'
}

function nameFromVar(varName: string): string {
  return varName
    .replace(/^(?:color-|clr-|c-)/, '')
    .replace(/-(?:color|clr|c)$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase())
    .trim()
}

function nameFromHsl(hex: string): string {
  const hsl = hexToHsl(hex)
  if (!hsl) return 'Color'
  const { h, s, l } = hsl
  if (s < 12) {
    if (l > 95) return 'White'
    if (l > 82) return 'Off White'
    if (l > 65) return 'Light Gray'
    if (l > 45) return 'Gray'
    if (l > 25) return 'Dark Gray'
    if (l > 12) return 'Charcoal'
    return 'Black'
  }
  if (h < 20 || h >= 340) return l > 55 ? 'Light Red' : 'Red'
  if (h < 40) return 'Orange'
  if (h < 65) return 'Yellow'
  if (h < 100) return l > 55 ? 'Light Green' : 'Green'
  if (h < 155) return 'Green'
  if (h < 195) return 'Teal'
  if (h < 250) return l > 55 ? 'Light Blue' : 'Blue'
  if (h < 285) return 'Indigo'
  if (h < 320) return 'Purple'
  return 'Pink'
}

// ── Parsers ──

function extractCssVars(css: string): Map<string, string> {
  const map = new Map<string, string>()
  const re = /--([a-z][a-z0-9-]*):\s*([^;{}]+)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(css)) !== null) map.set(m[1].trim(), m[2].trim())
  return map
}

function extractAllHexColors(css: string): Map<string, number> {
  const counts = new Map<string, number>()
  const hexRe = /#([0-9a-fA-F]{3,8})\b/g
  const rgbRe = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)/g
  let m: RegExpExecArray | null
  while ((m = hexRe.exec(css)) !== null) {
    const norm = normalizeHex(m[0])
    if (norm) counts.set(norm, (counts.get(norm) || 0) + 1)
  }
  while ((m = rgbRe.exec(css)) !== null) {
    const hex = rgbToHex(+m[1], +m[2], +m[3])
    counts.set(hex, (counts.get(hex) || 0) + 1)
  }
  return counts
}

function extractFontFamilies(css: string, html: string): string[] {
  const seen = new Set<string>()
  const families: string[] = []

  // Google Fonts imports
  const gfRe = /family=([^&"'\s)]+)/gi
  let m: RegExpExecArray | null
  while ((m = gfRe.exec(css + html)) !== null) {
    m[1].split('|').forEach(f => {
      const name = decodeURIComponent(f.split(':')[0]).replace(/\+/g, ' ').trim()
      if (name && !seen.has(name)) { seen.add(name); families.push(name) }
    })
  }

  // font-family declarations
  const ffRe = /font-family:\s*([^;{}]+)/gi
  while ((m = ffRe.exec(css)) !== null) {
    const val = m[1].trim().replace(/!important/gi,'').trim()
    const first = val.split(',')[0].replace(/["']/g,'').trim()
    if (first && first.length < 60 && !seen.has(first)) {
      seen.add(first); families.push(first)
    }
  }

  return families.slice(0, 6)
}

// Normalize any CSS length to px for correct size comparison
function normalizeToPx(size: string): number {
  const v = parseFloat(size)
  if (!v) return 0
  if (/rem/.test(size)) return v * 16
  if (/em/.test(size)) return v * 16
  if (/pt/.test(size)) return v * 1.333
  return v // px or unitless
}

function extractFontSizes(css: string): Map<string, number> {
  const counts = new Map<string, number>()
  const re = /font-size:\s*(\d+(?:\.\d+)?(?:px|rem|em|pt))/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(css)) !== null) counts.set(m[1], (counts.get(m[1]) || 0) + 1)
  return counts
}

function extractFontWeights(css: string): number[] {
  const weights = new Set<number>()
  const re = /font-weight:\s*(\d{3})\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css)) !== null) weights.add(+m[1])
  return [...weights].sort((a,b) => a-b)
}

function extractLineHeights(css: string): string[] {
  const counts = new Map<string, number>()
  const re = /line-height:\s*([\d.]+)\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css)) !== null) counts.set(m[1], (counts.get(m[1]) || 0) + 1)
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(e=>e[0])
}

function extractSpacingValues(css: string): Map<number, number> {
  const counts = new Map<number, number>()
  // Cast net wider: padding, margin, gap, inset — all layout spacing properties
  const re = /(?:padding|margin|gap|row-gap|column-gap|inset)(?:-(?:top|right|bottom|left|inline|block|start|end))?\s*:\s*([^;{}]+)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(css)) !== null) {
    const parts = m[1].split(/\s+/)
    for (const p of parts) {
      const vMatch = p.match(/^(\d+(?:\.\d+)?)px$/)
      if (vMatch) {
        const v = parseFloat(vMatch[1])
        // 4–200px: below 4 is likely border/outline noise; above 200 is likely width/height
        if (v >= 4 && v <= 200) counts.set(v, (counts.get(v) || 0) + 1)
      }
      // Also count rem values (convert to px)
      const remMatch = p.match(/^(\d+(?:\.\d+)?)rem$/)
      if (remMatch) {
        const v = Math.round(parseFloat(remMatch[1]) * 16)
        if (v >= 4 && v <= 200) counts.set(v, (counts.get(v) || 0) + 1)
      }
    }
  }
  return counts
}

function inferSpacingScale(values: Map<number, number>): number[] {
  const topValues = [...values.entries()]
    .sort((a,b) => b[1]-a[1])
    .slice(0, 20)
    .map(e => e[0])
    .sort((a,b) => a-b)

  if (topValues.length === 0) return [4,8,12,16,24,32,48,64]

  // Find base unit: smallest common divisor
  const min = topValues[0]
  const base = min <= 2 ? 4 : min <= 5 ? 4 : min <= 8 ? 8 : 4

  return topValues.slice(0, 12)
}

function extractBorderRadius(css: string): Map<string, number> {
  const counts = new Map<string, number>()
  const re = /border-radius:\s*([^;{}]+)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(css)) !== null) {
    // Strip !important, take first value of shorthand
    const raw = m[1].trim().split(/\s+/)[0].replace(/!important/gi, '').trim()
    if (/^\d/.test(raw) && raw !== '0' && raw !== '0px') {
      counts.set(raw, (counts.get(raw) || 0) + 1)
    }
    // Also catch % and full values (50%, 100%)
    if (/^\d+%$/.test(raw)) counts.set(raw, (counts.get(raw) || 0) + 1)
  }
  return counts
}

function extractShadows(css: string): string[] {
  const seen = new Set<string>()
  const re = /box-shadow:\s*([^;{}]+)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(css)) !== null) {
    const v = m[1].trim().replace(/!important/gi,'').trim()
    if (v !== 'none' && v.length < 200) seen.add(v)
  }
  return [...seen].slice(0, 6)
}

function extractBreakpoints(css: string): { name: string; value: string }[] {
  const seen = new Set<string>()
  const re = /@media[^{]*\((?:min|max)-width:\s*(\d+(?:\.\d+)?px)\)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(css)) !== null) seen.add(m[1])

  const sorted = [...seen]
    .map(v => parseFloat(v))
    .filter(v => v > 300)
    .sort((a,b) => a-b)

  const names = ['sm','md','lg','xl','2xl','3xl']
  return sorted.slice(0, 6).map((v, i) => ({ name: names[i] || `bp${i+1}`, value: `${v}px` }))
}

function extractTransitions(css: string): { durations: string[]; easing: string[] } {
  const durs = new Set<string>()
  const ease = new Set<string>()

  const durRe = /\b(\d+(?:\.\d+)?(?:ms|s))\b/g
  const allTransitions: string[] = []
  const trRe = /transition(?:-duration)?:\s*([^;{}]+)/gi
  let m: RegExpExecArray | null
  while ((m = trRe.exec(css)) !== null) allTransitions.push(m[1])

  for (const t of allTransitions) {
    let d: RegExpExecArray | null
    while ((d = durRe.exec(t)) !== null) durs.add(d[1])
    if (/ease-in-out/i.test(t)) ease.add('ease-in-out')
    else if (/ease-in/i.test(t)) ease.add('ease-in')
    else if (/ease-out/i.test(t)) ease.add('ease-out')
    else if (/linear/i.test(t)) ease.add('linear')
    const cb = t.match(/cubic-bezier\([^)]+\)/)
    if (cb) ease.add(cb[0])
  }

  return { durations: [...durs].slice(0,6), easing: [...ease].slice(0,4) }
}

function detectDesignSystem(css: string, html: string): string | null {
  const combined = (css + html).toLowerCase()
  if (combined.includes('tailwind') || /\btw-\w/.test(combined)) return 'Tailwind CSS'
  if (combined.includes('bootstrap') || /\bbtn-primary\b/.test(combined)) return 'Bootstrap'
  if (/\bchakra/.test(combined)) return 'Chakra UI'
  if (/\bmui|muibutton|makeStyles/.test(combined)) return 'Material UI'
  if (/\bant-design|anticon/.test(combined)) return 'Ant Design'
  if (combined.includes('shadcn') || combined.includes('radix-ui')) return 'shadcn/ui'
  return null
}

function tokenName(i: number): string {
  return ['xs','sm','md','lg','xl','2xl','3xl','4xl','5xl','6xl','7xl','8xl'][i] ?? `t${i+1}`
}

// ── Main analyzer ──

export function analyzeCss(css: string, html: string): AnalyzedDesign {
  const cssVars = extractCssVars(css)

  // ── Colors ──
  const colorVarPairs: { varName: string; hex: string }[] = []
  for (const [k, v] of cssVars) {
    if (/color|clr|bg|background|text|fill|stroke|border/.test(k)) {
      const norm = normalizeHex(v)
      if (norm) colorVarPairs.push({ varName: k, hex: norm })
    }
  }

  const allHex = extractAllHexColors(css)

  // Build color list: CSS vars first, then high-freq hardcoded
  const usedHex = new Set(colorVarPairs.map(c => c.hex))
  const colors: ColorToken[] = []

  for (const { varName, hex } of colorVarPairs) {
    const freq = allHex.get(hex) || 1
    colors.push({
      name: nameFromVar(varName),
      hex,
      usage: '',
      frequency: freq,
      group: colorGroup(hex),
      cssVar: `--${varName}`,
    })
  }

  // Add high-frequency hardcoded colors not already captured
  const topHardcoded = [...allHex.entries()]
    .sort((a,b) => b[1]-a[1])
    .slice(0, 40)

  for (const [hex, freq] of topHardcoded) {
    if (!usedHex.has(hex) && freq >= 3) {
      colors.push({
        name: nameFromHsl(hex),
        hex,
        usage: '',
        frequency: freq,
        group: colorGroup(hex),
      })
      usedHex.add(hex)
    }
  }

  // Deduplicate by hex, keep highest frequency
  const deduped = new Map<string, ColorToken>()
  for (const c of colors) {
    const existing = deduped.get(c.hex)
    if (!existing || c.frequency > existing.frequency) deduped.set(c.hex, c)
  }

  const finalColors = [...deduped.values()]
    .sort((a,b) => {
      if (a.group !== b.group) {
        const order = { neutrals: 0, brand: 1, semantic: 2 }
        return order[a.group] - order[b.group]
      }
      return b.frequency - a.frequency
    })
    .slice(0, 20)

  // ── Typography ──
  const fontFamilies = extractFontFamilies(css, html)

  // Font sizes from CSS vars first
  const sizeVarEntries: { name: string; value: string }[] = []
  for (const [k, v] of cssVars) {
    if (/font-size|text-size|type-size|fs-/.test(k) && /\d+(?:px|rem)/.test(v)) {
      sizeVarEntries.push({ name: k, value: v.trim() })
    }
  }

  const fontSizeFreq = extractFontSizes(css)
  const topSizes = [...fontSizeFreq.entries()]
    .sort((a,b) => b[1]-a[1])    // first pick top-10 by frequency
    .slice(0, 12)
    .map(e => e[0])
    // Sort by NORMALIZED px value (fixes 7.5em > 18px ordering)
    .sort((a,b) => normalizeToPx(b) - normalizeToPx(a))
    // Drop tiny utility sizes (< 8px normalized) that aren't type scale
    .filter(s => normalizeToPx(s) >= 8)

  const roles = ['Display', 'H1', 'H2', 'H3', 'H4', 'Body Large', 'Body', 'Small', 'Caption', 'Label']
  const typeScale: TypeScale[] = topSizes.slice(0, 8).map((size, i) => ({
    role: roles[i] || `Level ${i+1}`,
    size,
  }))

  const fontWeights = extractFontWeights(css)
  const lineHeights = extractLineHeights(css)

  const fontSources: string[] = []
  const gfMatch = (css + html).match(/https?:\/\/fonts\.googleapis\.com[^\s"')>]+/)
  if (gfMatch) fontSources.push(gfMatch[0].split('"')[0].split("'")[0])

  // ── Spacing ──
  // CSS variable-based spacing first
  const spacingVars: { name: string; value: string }[] = []
  for (const [k, v] of cssVars) {
    if (/^(?:spacing|space|gap|margin|padding)-/.test(k) || /-(?:spacing|space|gap)$/.test(k)) {
      if (/\d+(?:px|rem)/.test(v)) spacingVars.push({ name: k, value: v.trim() })
    }
  }

  const spacingFreq = extractSpacingValues(css)
  const spacingScale = inferSpacingScale(spacingFreq)
  const baseUnit = spacingScale.length > 0 ? `${spacingScale[0]}px` : '4px'

  const spacingNamed = spacingVars.length > 0
    ? spacingVars.map((sv, i) => ({ name: tokenName(i), value: sv.value }))
    : spacingScale.map((v, i) => ({ name: tokenName(i), value: `${v}px` }))

  // ── Border Radius ──
  const radiusVars: { name: string; value: string }[] = []
  for (const [k, v] of cssVars) {
    if (/radius|rounded/.test(k) && /\d/.test(v)) {
      radiusVars.push({ name: k.replace(/^(?:border-)?radius-?/, ''), value: v.trim() })
    }
  }

  const radiusFreq = extractBorderRadius(css)
  const topRadius = [...radiusFreq.entries()]
    .sort((a,b) => b[1]-a[1])
    .slice(0, 8)
    .map(e => e[0])
    .sort((a,b) => parseFloat(a)-parseFloat(b))

  const radiusNamed = radiusVars.length > 0
    ? radiusVars.slice(0,8).map((r, i) => ({ name: tokenName(i), value: r.value }))
    : topRadius.map((v, i) => ({ name: tokenName(i), value: v }))

  return {
    method: 'frequency-analysis',
    design_system_detected: detectDesignSystem(css, html),
    colors: finalColors,
    typography: {
      font_families: fontFamilies,
      font_weights: fontWeights.length ? fontWeights : [400, 500, 600, 700],
      type_scale: typeScale,
      line_heights: lineHeights,
      font_sources: fontSources,
    },
    spacing: {
      base_unit: baseUnit,
      scale: spacingScale,
      named: spacingNamed.slice(0, 12),
    },
    border_radius: {
      values: topRadius,
      named: radiusNamed.slice(0, 8),
    },
    shadows: extractShadows(css),
    breakpoints: extractBreakpoints(css),
    transitions: extractTransitions(css),
  }
}
