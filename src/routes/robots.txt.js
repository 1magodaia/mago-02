import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/robots/txt")({
    server: {
        handlers: {
            GET: async () => {
                const DOMAIN = "https://buscamagica.lovable.app";
                const content = `User-agent: *
Allow: /
Allow: /novidades
Disallow: /master
Disallow: /leads
Disallow: /auth
Disallow: /api/
Disallow: /admin
Disallow: /_authenticated

Sitemap: ${DOMAIN}/sitemap.xml
`;
                return new Response(content, {
                    headers: {
                        "Content-Type": "text/plain",
                        "Cache-Control": "public, max-age=3600",
                    },
                });
            },
        },
    },
});
