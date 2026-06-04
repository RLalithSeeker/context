import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Context-MCP — The context layer for any website",
  description:
    "Sixteen scraping and LLM tools behind one endpoint. Markdown, structured JSON, brand intel, design systems, fonts, products — from a single URL. Bring your own Groq key.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body-md text-body-md text-on-surface antialiased pt-16">
        {children}
      </body>
    </html>
  );
}
