import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Context-MCP",
  description: "15 web scraping tools powered by Groq LLM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
