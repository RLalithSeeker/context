export interface ColorToken {
  name: string
  hex: string
  usage: string
}

export interface StyleguideData {
  design_system_detected: string | null
  colors: ColorToken[]
  typography: {
    font_families: string[]
    font_weights: number[]
    font_sizes: {
      h1: string; h2: string; h3: string; h4: string; h5: string; h6: string
      body: string; small: string
    }
    line_heights: string[]
    letter_spacing: string | null
    font_sources: string[]
  }
  spacing: {
    base_unit: string
    scale: number[]
    pattern: string | null
  }
  border_radius: {
    values: string[]
    pattern: string | null
  }
  shadows: string[]
  breakpoints: { name: string; value: string }[]
  transitions: {
    durations: string[]
    easing: string[]
  }
}

export interface BrandData {
  company_name: string | null
  brand_name: string | null
  tagline: string | null
  description: string | null
  industry: string | null
  website: string | null
  social_profiles: {
    twitter: string | null
    linkedin: string | null
    github: string | null
    instagram: string | null
    facebook: string | null
    youtube: string | null
  }
  contact: {
    email: string | null
    phone: string | null
    address: string | null
  }
  logo_url: string | null
  brand_colors: { name: string; hex: string }[]
}

export interface DesignResult {
  url: string
  title: string
  brand: BrandData
  design: StyleguideData
  overview: string
  style_tags: string[]
  outputs: {
    design_md: string
    tailwind: string
    css_variables: string
    design_tokens: object
  }
}
