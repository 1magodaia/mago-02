import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/sitemap/xml")({
    server: {
        handlers: {
            GET: async () => {
                const DOMAIN = "https://buscamagica.lovable.app";
                const now = new Date().toISOString().split("T")[0];
                // Páginas públicas
                const pages = [
                    { url: "/", priority: "1.0", changefreq: "daily" },
                    { url: "/novidades", priority: "0.8", changefreq: "weekly" },
                ];
                const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
                    .map((p) => `  <url>
    <loc>${DOMAIN}${p.url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`)
                    .join("\n")}
</urlset>`;
                return new Response(xml, {
                    headers: {
                        "Content-Type": "application/xml",
                        "Cache-Control": "public, max-age=3600",
                    },
                });
            },
        },
    },
});
