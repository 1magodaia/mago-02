import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const auditSchema = z.object({
  website: z.string().url().max(500),
  phone: z.string().max(50).optional(),
});

export interface DigitalAudit {
  site_reachable: boolean;
  site_status_code: number | null;
  instagram: string | null;
  facebook: string | null;
  whatsapp_link: string | null;
  sitemap_lastmod: string | null; // ISO date
  domain_registered_at: string | null; // ISO date via RDAP
  domain_expires_at: string | null;
  approx_stale_days: number | null; // heurística
  audited_at: string;
  note: string;
}

const FETCH_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 300_000;

async function timedFetch(url: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": "BuscaMagica-Audit/1.0", ...(init?.headers ?? {}) },
      redirect: "follow",
    });
  } catch {
    return null;
  }
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let total = 0;
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    out += decoder.decode(value, { stream: true });
    if (total >= MAX_HTML_BYTES) {
      try { await reader.cancel(); } catch { /* ignore */ }
      break;
    }
  }
  return out;
}

function extractSocials(html: string): {
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
} {
  const ig = html.match(/https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9_.]{2,30})/i);
  const fb = html.match(/https?:\/\/(?:www\.)?facebook\.com\/([A-Za-z0-9_.-]{2,50})/i);
  const wa = html.match(/https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send)[^\s"'<>]+/i);
  return {
    instagram: ig ? `https://instagram.com/${ig[1]}` : null,
    facebook: fb ? `https://facebook.com/${fb[1]}` : null,
    whatsapp: wa ? wa[0] : null,
  };
}

async function fetchSitemapLastMod(origin: string): Promise<string | null> {
  const res = await timedFetch(`${origin}/sitemap.xml`);
  if (!res || !res.ok) return null;
  const xml = await res.text();
  const matches = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/gi)];
  if (matches.length === 0) return null;
  const dates = matches
    .map((m) => Date.parse(m[1].trim()))
    .filter((n) => Number.isFinite(n));
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates)).toISOString();
}

interface RdapEvent { eventAction?: string; eventDate?: string }
interface RdapResp { events?: RdapEvent[] }

async function fetchRdap(hostname: string): Promise<{ registered: string | null; expires: string | null }> {
  const domain = hostname.replace(/^www\./, "");
  const res = await timedFetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`);
  if (!res || !res.ok) return { registered: null, expires: null };
  const data = (await res.json().catch(() => null)) as RdapResp | null;
  if (!data?.events) return { registered: null, expires: null };
  const find = (action: string) =>
    data.events?.find((e) => e.eventAction?.toLowerCase() === action)?.eventDate ?? null;
  return { registered: find("registration"), expires: find("expiration") };
}

function normalizeWhatsAppFromPhone(phone: string | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

export const auditWebsite = createServerFn({ method: "POST" })
  .inputValidator((input) => auditSchema.parse(input))
  .handler(async ({ data }): Promise<DigitalAudit> => {
    const now = new Date().toISOString();
    let url: URL;
    try {
      url = new URL(data.website);
    } catch {
      return {
        site_reachable: false,
        site_status_code: null,
        instagram: null,
        facebook: null,
        whatsapp_link: normalizeWhatsAppFromPhone(data.phone),
        sitemap_lastmod: null,
        domain_registered_at: null,
        domain_expires_at: null,
        approx_stale_days: null,
        audited_at: now,
        note: "URL inválida.",
      };
    }

    const origin = `${url.protocol}//${url.host}`;
    const [pageRes, sitemapLastMod, rdap] = await Promise.all([
      timedFetch(data.website),
      fetchSitemapLastMod(origin),
      fetchRdap(url.hostname),
    ]);

    let socials = { instagram: null as string | null, facebook: null as string | null, whatsapp: null as string | null };
    let statusCode: number | null = null;
    let reachable = false;

    if (pageRes) {
      statusCode = pageRes.status;
      reachable = pageRes.ok;
      if (pageRes.ok) {
        const html = await readCapped(pageRes);
        socials = extractSocials(html);
      }
    }

    const waFromPage = socials.whatsapp;
    const waFromPhone = normalizeWhatsAppFromPhone(data.phone);
    const whatsapp_link = waFromPage ?? waFromPhone;

    let approx_stale_days: number | null = null;
    if (sitemapLastMod) {
      approx_stale_days = Math.floor((Date.now() - Date.parse(sitemapLastMod)) / 86400000);
    }

    const notes: string[] = [];
    if (!sitemapLastMod) notes.push("sitemap.xml indisponível");
    if (!rdap.registered) notes.push("WHOIS/RDAP sem dados públicos");
    if (!reachable) notes.push(`site retornou ${statusCode ?? "erro de rede"}`);

    return {
      site_reachable: reachable,
      site_status_code: statusCode,
      instagram: socials.instagram,
      facebook: socials.facebook,
      whatsapp_link,
      sitemap_lastmod: sitemapLastMod,
      domain_registered_at: rdap.registered,
      domain_expires_at: rdap.expires,
      approx_stale_days,
      audited_at: now,
      note: notes.length ? notes.join(" · ") : "dados obtidos com sucesso",
    };
  });
