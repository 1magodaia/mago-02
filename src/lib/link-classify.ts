/**
 * Link classification & normalization.
 *
 * O Google Places (e outras fontes) frequentemente devolve o Instagram/Facebook
 * do comércio no campo `website`, ou envolve o link real em um redirecionador
 * (l.instagram.com, l.facebook.com, google.com/url?q=…, lm.facebook.com).
 * Também é comum o link vir sem esquema ("www.example.com") ou carregado de
 * parâmetros de tracking (utm_*, fbclid, gclid).
 *
 * Este módulo resolve o destino final e classifica o tipo do link — de forma
 * pura, sem dependência de React ou I/O, para ser 100% testável.
 */

export type LinkKind = "site" | "instagram" | "facebook" | "other";

export interface ClassifiedLink {
  /** Tipo lógico do destino. "other" = string vazia/URL inválida. */
  kind: LinkKind;
  /** URL absoluta e limpa, pronta para uso em href — ou null. */
  url: string | null;
  /** Host final (sem www.), útil para exibir "instagram.com/foo". */
  host: string | null;
}

const IG_HOSTS = new Set(["instagram.com", "instagr.am"]);
const FB_HOSTS = new Set(["facebook.com", "fb.com", "fb.me", "m.facebook.com"]);
const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|mc_|_hs|hsCtaTracking$|igshid$|share$|ref$|ref_src$|si$)/i;

/** True quando o host (ou subdomínio) pertence ao Instagram. */
function isInstagramHost(host: string): boolean {
  if (IG_HOSTS.has(host)) return true;
  return host.endsWith(".instagram.com") || host.endsWith(".instagr.am");
}

/** True quando o host (ou subdomínio) pertence ao Facebook. */
function isFacebookHost(host: string): boolean {
  if (FB_HOSTS.has(host)) return true;
  return host.endsWith(".facebook.com") || host.endsWith(".fb.com");
}

/**
 * Desembrulha redirecionadores conhecidos que carregam a URL de destino
 * dentro de um parâmetro. Retorna a URL contida, ou null se não houver.
 */
function unwrapRedirector(u: URL): string | null {
  const host = u.hostname.toLowerCase().replace(/^www\./, "");

  // Facebook / Instagram usam l.facebook.com/l.php?u=… e l.instagram.com/?u=…
  if (host === "l.facebook.com" || host === "lm.facebook.com" || host === "l.instagram.com") {
    const inner = u.searchParams.get("u");
    if (inner) return inner;
  }

  // Google usa /url?q=… (search result out-link) e /url?url=… (ads).
  if ((host === "google.com" || host.endsWith(".google.com")) && u.pathname === "/url") {
    const inner = u.searchParams.get("q") ?? u.searchParams.get("url");
    if (inner) return inner;
  }

  // Redirect classic pattern: any ?redirect=<absolute-url>
  const generic = u.searchParams.get("redirect") ?? u.searchParams.get("target");
  if (generic && /^https?:\/\//i.test(generic)) return generic;

  return null;
}

/**
 * Remove parâmetros de tracking (utm_*, fbclid, gclid, igshid, etc.) sem
 * quebrar params legítimos. Retorna nova URL.
 */
function stripTracking(u: URL): URL {
  const clean = new URL(u.toString());
  const toDelete: string[] = [];
  clean.searchParams.forEach((_, key) => {
    if (TRACKING_PARAMS.test(key)) toDelete.push(key);
  });
  toDelete.forEach((k) => clean.searchParams.delete(k));
  // Remove fragmento vazio "#"
  if (clean.hash === "#") clean.hash = "";
  return clean;
}

/**
 * Normaliza uma string de link em URL absoluta:
 * - Aceita "instagram.com/foo", "www.foo.com" e adiciona https://.
 * - Segue redirecionadores conhecidos (até 3 níveis) para chegar ao destino real.
 * - Remove parâmetros de tracking.
 * Retorna null se não for possível derivar uma URL http(s) válida.
 */
export function normalizeUrl(raw: string | null | undefined): URL | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Adiciona esquema se faltar. Rejeita esquemas não-http (mailto:, tel:, javascript:).
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(candidate)) return null;
    candidate = `https://${candidate}`;
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  // Segue redirecionadores conhecidos, com limite para evitar loops.
  for (let hops = 0; hops < 3; hops++) {
    const inner = unwrapRedirector(url);
    if (!inner) break;
    try {
      url = new URL(inner);
    } catch {
      break;
    }
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  return stripTracking(url);
}

/**
 * Classifica uma string de link em site real, Instagram ou Facebook,
 * já devolvendo a URL normalizada pronta para uso no href do botão.
 */
export function classifyLink(raw: string | null | undefined): ClassifiedLink {
  const url = normalizeUrl(raw);
  if (!url) return { kind: "other", url: null, host: null };

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const href = url.toString();

  if (isInstagramHost(host)) return { kind: "instagram", url: href, host };
  if (isFacebookHost(host)) return { kind: "facebook", url: href, host };
  return { kind: "site", url: href, host };
}

/**
 * Conveniência: `true` quando o link é um site real (não rede social).
 * Usado para decidir se o botão "Auditar" deve aparecer.
 */
export function isRealSite(raw: string | null | undefined): boolean {
  return classifyLink(raw).kind === "site";
}
