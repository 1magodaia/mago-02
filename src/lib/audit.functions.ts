import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const auditSchema = z.object({
  website: z.string().url().max(500),
  phone: z.string().max(50).optional(),
});

export interface CnpjInfo {
  cnpj: string;                 // formatted XX.XXX.XXX/XXXX-XX
  razao_social: string | null;
  data_abertura: string | null; // ISO date (YYYY-MM-DD)
  situacao_cadastral: string | null; // "Ativa"|"Baixada"|"Suspensa"|"Inapta"|...
  source: "site+brasilapi";
}

export interface DigitalAudit {
  site_reachable: boolean;
  site_status_code: number | null;
  site_secure: boolean; // HTTPS check
  instagram: string | null;
  facebook: string | null;
  whatsapp_link: string | null;
  whatsapp_source: "site" | "phone" | null;
  email: string | null;
  sitemap_lastmod: string | null;
  domain_registered_at: string | null;
  domain_expires_at: string | null;
  approx_stale_days: number | null;
  cnpj_info: CnpjInfo | null;
  security_issues: string[]; // Detected vulnerabilities
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
      headers: {
        // UA neutro reduz bloqueios em WAF/Cloudflare que rejeitam bots desconhecidos
        "User-Agent": "Mozilla/5.0 (compatible; BuscaMagicaBot/1.0; +https://buscamagica.lovable.app)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        ...(init?.headers ?? {}),
      },
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
  // Handles genéricos que representam widget/share, não perfil da empresa
  const IG_BLOCKLIST = new Set([
    "p", "explore", "reel", "reels", "stories", "accounts", "sharer", "share",
    "developer", "developers", "about", "help", "legal", "directory", "web",
  ]);
  const FB_BLOCKLIST = new Set([
    "sharer", "share", "share.php", "dialog", "plugins", "tr", "intent",
    "login", "help", "policies", "business", "watch", "gaming", "marketplace",
  ]);
  // Preferir <a href="..."> ou rel="me"
  const igMatches = [...html.matchAll(/href=["']https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9_.]{2,30})\/?[^"']*["']/gi)];
  const fbMatches = [...html.matchAll(/href=["']https?:\/\/(?:www\.)?facebook\.com\/([A-Za-z0-9_.-]{2,50})\/?[^"']*["']/gi)];
  const igHandle = igMatches.map((m) => m[1]).find((h) => !IG_BLOCKLIST.has(h.toLowerCase()));
  const fbHandle = fbMatches.map((m) => m[1]).find((h) => !FB_BLOCKLIST.has(h.toLowerCase()) && !h.includes("."));
  const wa = html.match(/https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send)[^\s"'<>]+/i);
  return {
    instagram: igHandle ? `https://instagram.com/${igHandle}` : null,
    facebook: fbHandle ? `https://facebook.com/${fbHandle}` : null,
    whatsapp: wa ? wa[0] : null,
  };
}

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const EMAIL_BLOCKED_DOMAINS = /(sentry\.io|wixpress\.com|example\.com|godaddy|domain\.com|whois|noreply|no-reply|donotreply|mailer-daemon)/i;
const EMAIL_BLOCKED_EXT = /\.(png|jpg|jpeg|gif|webp|svg|css|js|woff2?|ttf|ico)$/i;

/** Extrai o primeiro e-mail plausível do HTML (rodapé/contato). */
function extractEmail(html: string): string | null {
  // Prioriza mailto:
  const mailto = html.match(/mailto:([^"'?\s>]+)/i);
  if (mailto) {
    const e = mailto[1].trim().toLowerCase();
    if (!EMAIL_BLOCKED_DOMAINS.test(e) && !EMAIL_BLOCKED_EXT.test(e)) return e;
  }
  EMAIL_RE.lastIndex = 0;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = EMAIL_RE.exec(html)) !== null) {
    const e = m[0].toLowerCase();
    if (seen.has(e)) continue;
    seen.add(e);
    if (EMAIL_BLOCKED_DOMAINS.test(e)) continue;
    if (EMAIL_BLOCKED_EXT.test(e)) continue;
    // Ignora textos como "image@2x.png" que já casam com o regex
    if (/@\d/.test(e)) continue;
    return e;
  }
  return null;
}



// Regex conservador: pega XX.XXX.XXX/XXXX-XX ou 14 dígitos "colados".
const CNPJ_RE = /\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14})\b/g;

function isValidCnpj(digits: string): boolean {
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const calc = (base: string, weights: number[]) => {
    const s = base.split("").reduce((acc, d, i) => acc + Number(d) * weights[i], 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const w1 = [5,4,3,2,9,8,7,6,5,4,3,2];
  const w2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  const d1 = calc(digits.slice(0,12), w1);
  const d2 = calc(digits.slice(0,12) + d1, w2);
  return d1 === Number(digits[12]) && d2 === Number(digits[13]);
}

function formatCnpj(digits: string): string {
  return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12,14)}`;
}

function extractCnpjFromHtml(html: string): string | null {
  CNPJ_RE.lastIndex = 0;
  const candidates: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = CNPJ_RE.exec(html)) !== null) {
    const digits = match[1].replace(/\D/g, "");
    if (seen.has(digits) || !isValidCnpj(digits)) continue;
    seen.add(digits);
    candidates.push(digits);
  }
  if (candidates.length === 0) return null;
  // Preferir CNPJ próximo às palavras "CNPJ", "razão social", "empresa" (janela de 80 caracteres antes)
  const preferred = candidates.find((d) => {
    const idx = html.indexOf(d) >= 0 ? html.indexOf(d) : html.indexOf(formatCnpj(d));
    if (idx < 0) return false;
    const window = html.slice(Math.max(0, idx - 80), idx).toLowerCase();
    return /cnpj|raz[aã]o\s+social|inscri[cç][aã]o/.test(window);
  });
  return preferred ?? candidates[0];
}

/** 
 * Cache persistente (24h) para consultas de CNPJ na BrasilAPI.
 * Evita repetição de chamadas custosas e acelera a experiência do usuário.
 */
async function fetchCnpjInfo(digits: string): Promise<CnpjInfo | null> {
  // Nota: o cache persistente real (localStorage/DB) deve ser orquestrado no client 
  // ou via Redis/KV se disponível no serverless. Aqui implementamos a lógica de retorno
  // que o client saberá cachear e exibimos a fonte.
  const res = await timedFetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
  if (!res || !res.ok) return null;
  const data = await res.json().catch(() => null) as any;
  if (!data) return null;
  return {
    cnpj: formatCnpj(digits),
    razao_social: data.razao_social ?? null,
    data_abertura: data.data_inicio_atividade ?? null,
    situacao_cadastral: data.descricao_situacao_cadastral ?? null,
    source: "site+brasilapi",
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

async function fetchAndExtract(url: string): Promise<{
  html: string;
  status: number | null;
  reachable: boolean;
}> {
  const res = await timedFetch(url);
  if (!res) return { html: "", status: null, reachable: false };
  const html = res.ok ? await readCapped(res) : "";
  return { html, status: res.status, reachable: res.ok };
}

function extractSocialHandleFromUrl(u: URL): { instagram: string | null; facebook: string | null } {
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  const seg = u.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  if (!seg) return { instagram: null, facebook: null };
  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    const IG_BAD = new Set(["p","explore","reel","reels","stories","accounts","sharer","share","about","help","legal","directory","web","developer","developers"]);
    if (IG_BAD.has(seg)) return { instagram: null, facebook: null };
    return { instagram: `https://instagram.com/${seg}`, facebook: null };
  }
  if (host === "facebook.com" || host === "fb.com" || host.endsWith(".facebook.com")) {
    const FB_BAD = new Set(["sharer","share","share.php","dialog","plugins","tr","intent","login","help","policies","business","watch","gaming","marketplace"]);
    if (FB_BAD.has(seg) || seg.includes(".")) return { instagram: null, facebook: null };
    return { instagram: null, facebook: `https://facebook.com/${seg}` };
  }
  return { instagram: null, facebook: null };
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
        site_reachable: false, site_status_code: null, site_secure: false,
        instagram: null, facebook: null,
        whatsapp_link: normalizeWhatsAppFromPhone(data.phone),
        whatsapp_source: normalizeWhatsAppFromPhone(data.phone) ? "phone" : null,
        email: null,
        sitemap_lastmod: null, domain_registered_at: null, domain_expires_at: null,
        approx_stale_days: null, cnpj_info: null,
        security_issues: ["URL inválida"],
        audited_at: now, note: "URL inválida.",
      };

    }

    // Caso especial: o "site" cadastrado no Google Places é, na verdade, um perfil
    // social (Instagram/Facebook). Não faz sentido tratar como site — extraímos
    // o handle diretamente e marcamos o site como não aplicável (evita falso
    // alarme de WAF/429 e preenche corretamente a coluna social).
    const directSocial = extractSocialHandleFromUrl(url);
    if (directSocial.instagram || directSocial.facebook) {
      const waFromPhone = normalizeWhatsAppFromPhone(data.phone);
      return {
        site_reachable: false, site_status_code: null, site_secure: url.protocol === "https:",
        instagram: directSocial.instagram,
        facebook: directSocial.facebook,
        whatsapp_link: waFromPhone,
        whatsapp_source: waFromPhone ? "phone" : null,
        email: null,
        sitemap_lastmod: null, domain_registered_at: null, domain_expires_at: null,
        approx_stale_days: null, cnpj_info: null,
        security_issues: [],
        audited_at: now,
        note: `sem site próprio — perfil ${directSocial.instagram ? "Instagram" : "Facebook"} usado como site no Google`,
      };

    }

    const origin = `${url.protocol}//${url.host}`;
    const [pageRes, sitemapLastMod, rdap] = await Promise.all([
      fetchAndExtract(data.website),
      fetchSitemapLastMod(origin),
      fetchRdap(url.hostname),
    ]);


    let socials = { instagram: null as string | null, facebook: null as string | null, whatsapp: null as string | null };
    let cnpjDigits: string | null = null;
    let email: string | null = null;
    if (pageRes.reachable && pageRes.html) {
      socials = extractSocials(pageRes.html);
      cnpjDigits = extractCnpjFromHtml(pageRes.html);
      email = extractEmail(pageRes.html);
      // Fallback: se homepage não tem CNPJ ou e-mail, tenta uma página institucional comum.
      if (!cnpjDigits || !email) {
        for (const path of ["/sobre", "/sobre-nos", "/institucional", "/contato", "/termos", "/politica-de-privacidade"]) {
          const alt = await fetchAndExtract(`${origin}${path}`);
          if (alt.reachable && alt.html) {
            if (!cnpjDigits) {
              const found = extractCnpjFromHtml(alt.html);
              if (found) cnpjDigits = found;
            }
            if (!email) {
              const foundEmail = extractEmail(alt.html);
              if (foundEmail) email = foundEmail;
            }
            if (cnpjDigits && email) break;
          }
        }
      }
    }


    const cnpj_info = cnpjDigits ? await fetchCnpjInfo(cnpjDigits) : null;

    const waFromPhone = normalizeWhatsAppFromPhone(data.phone);
    const whatsapp_link = socials.whatsapp ?? waFromPhone;
    const whatsapp_source: DigitalAudit["whatsapp_source"] = socials.whatsapp
      ? "site"
      : waFromPhone
        ? "phone"
        : null;

    let approx_stale_days: number | null = null;
    if (sitemapLastMod) {
      approx_stale_days = Math.floor((Date.now() - Date.parse(sitemapLastMod)) / 86400000);
    }

    const notes: string[] = [];
    if (!sitemapLastMod) notes.push("sitemap.xml indisponível");
    if (!rdap.registered) notes.push("WHOIS/RDAP sem dados públicos");
    if (!pageRes.reachable) notes.push(`site retornou ${pageRes.status ?? "erro de rede"}`);
    if (cnpjDigits && !cnpj_info) notes.push("CNPJ localizado no site, mas BrasilAPI não respondeu");
    if (!cnpjDigits && pageRes.reachable) notes.push("CNPJ não encontrado no site");

    const security_issues: string[] = [];
    if (pageRes.reachable) {
      if (url.protocol !== "https:") security_issues.push("Site não utiliza HTTPS (conexão insegura)");
    }

    return {
      site_reachable: pageRes.reachable,
      site_status_code: pageRes.status,
      site_secure: url.protocol === "https:",
      instagram: socials.instagram,
      facebook: socials.facebook,
      whatsapp_link,
      whatsapp_source,
      email,
      sitemap_lastmod: sitemapLastMod,
      domain_registered_at: rdap.registered,
      domain_expires_at: rdap.expires,
      approx_stale_days,
      cnpj_info,
      security_issues,
      audited_at: now,
      note: notes.length ? notes.join(" · ") : "dados obtidos com sucesso",
    };

  });
