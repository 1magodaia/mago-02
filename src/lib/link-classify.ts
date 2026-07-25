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

export type LinkKind = "site" | "instagram" | "facebook" | "whatsapp" | "other";

/**
 * "confirmed" — a URL de entrada apontava diretamente para o destino final,
 *   sem redirecionadores. A classificação é um dado observado.
 * "inferred" — precisamos desembrulhar 1+ redirecionadores para chegar ao
 *   destino real. Ainda é o destino correto, mas a UI deve deixar claro que
 *   houve inferência.
 * "unknown" — link vazio/inválido.
 */
export type LinkConfidence = "confirmed" | "inferred" | "unknown";

export interface ClassifiedLink {
  /** Tipo lógico do destino. "other" = string vazia/URL inválida. */
  kind: LinkKind;
  /** URL absoluta e limpa, pronta para uso em href — ou null. */
  url: string | null;
  /** Host final (sem www.), útil para exibir "instagram.com/foo". */
  host: string | null;
  /** Confiança da classificação — ver `LinkConfidence`. */
  confidence: LinkConfidence;
  /** true quando pelo menos um redirecionador foi desembrulhado. */
  wasUnwrapped: boolean;
  /** true quando pelo menos um parâmetro de tracking foi removido. */
  hadTracking: boolean;
}

const IG_HOSTS = new Set(["instagram.com", "instagr.am"]);
const FB_HOSTS = new Set(["facebook.com", "fb.com", "fb.me", "m.facebook.com"]);
const WA_HOSTS = new Set(["wa.me", "api.whatsapp.com", "whatsapp.com", "chat.whatsapp.com"]);
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

/** True quando o host pertence ao WhatsApp (link direto, não é "site próprio"). */
function isWhatsappHost(host: string): boolean {
  if (WA_HOSTS.has(host)) return true;
  return host.endsWith(".whatsapp.com");
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
 * quebrar params legítimos. Retorna { url, stripped }.
 */
function stripTracking(u: URL): { url: URL; stripped: boolean } {
  const clean = new URL(u.toString());
  const toDelete: string[] = [];
  clean.searchParams.forEach((_, key) => {
    if (TRACKING_PARAMS.test(key)) toDelete.push(key);
  });
  toDelete.forEach((k) => clean.searchParams.delete(k));
  if (clean.hash === "#") clean.hash = "";
  return { url: clean, stripped: toDelete.length > 0 };
}

/** Resultado interno de normalize — carrega metadados usados por classifyLink. */
interface NormalizedResult {
  url: URL;
  wasUnwrapped: boolean;
  hadTracking: boolean;
}

function normalizeInternal(raw: string | null | undefined): NormalizedResult | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

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

  let wasUnwrapped = false;
  for (let hops = 0; hops < 3; hops++) {
    const inner = unwrapRedirector(url);
    if (!inner) break;
    try {
      url = new URL(inner);
      wasUnwrapped = true;
    } catch {
      break;
    }
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const { url: clean, stripped } = stripTracking(url);
  return { url: clean, wasUnwrapped, hadTracking: stripped };
}

/**
 * Normaliza uma string de link em URL absoluta:
 * - Aceita "instagram.com/foo", "www.foo.com" e adiciona https://.
 * - Segue redirecionadores conhecidos (até 3 níveis) para chegar ao destino real.
 * - Remove parâmetros de tracking.
 * Retorna null se não for possível derivar uma URL http(s) válida.
 */
export function normalizeUrl(raw: string | null | undefined): URL | null {
  return normalizeInternal(raw)?.url ?? null;
}

// --- Telemetria (agregação em memória, opcional) -----------------------------

interface ClassifyMetrics {
  total: number;
  byKind: Record<LinkKind, number>;
  byConfidence: Record<LinkConfidence, number>;
  redirectsUnwrapped: number;
  trackingStripped: number;
}

const metrics: ClassifyMetrics = {
  total: 0,
  byKind: { site: 0, instagram: 0, facebook: 0, other: 0 },
  byConfidence: { confirmed: 0, inferred: 0, unknown: 0 },
  redirectsUnwrapped: 0,
  trackingStripped: 0,
};

function recordMetric(result: ClassifiedLink): void {
  metrics.total += 1;
  metrics.byKind[result.kind] += 1;
  metrics.byConfidence[result.confidence] += 1;
  if (result.wasUnwrapped) metrics.redirectsUnwrapped += 1;
  if (result.hadTracking) metrics.trackingStripped += 1;

  // Modo debug opcional: `window.__bmClassifyDebug = true` no console
  // para inspecionar classificações "estranhas" (site declarado que na real
  // é rede social, redirect unwrapping, etc.). Nunca loga em produção por
  // padrão para não poluir o console de usuários finais.
  if (typeof window !== "undefined" && (window as unknown as { __bmClassifyDebug?: boolean }).__bmClassifyDebug) {
    // eslint-disable-next-line no-console
    console.debug("[classifyLink]", {
      kind: result.kind,
      confidence: result.confidence,
      wasUnwrapped: result.wasUnwrapped,
      hadTracking: result.hadTracking,
      host: result.host,
    });
  }
}

/** Snapshot imutável das métricas acumuladas nesta sessão. */
export function getClassifyMetrics(): Readonly<ClassifyMetrics> {
  return {
    ...metrics,
    byKind: { ...metrics.byKind },
    byConfidence: { ...metrics.byConfidence },
  };
}

/** Zera métricas (uso em testes). */
export function resetClassifyMetrics(): void {
  metrics.total = 0;
  metrics.redirectsUnwrapped = 0;
  metrics.trackingStripped = 0;
  (Object.keys(metrics.byKind) as LinkKind[]).forEach((k) => { metrics.byKind[k] = 0; });
  (Object.keys(metrics.byConfidence) as LinkConfidence[]).forEach((k) => { metrics.byConfidence[k] = 0; });
}

/**
 * Classifica uma string de link em site real, Instagram ou Facebook,
 * já devolvendo a URL normalizada pronta para uso no href do botão.
 *
 * O campo `confidence` indica se o resultado é "confirmed" (URL direta) ou
 * "inferred" (foi preciso desembrulhar redirecionador). UIs devem sinalizar
 * inferências para não apresentar dado inferido como confirmado.
 */
export function classifyLink(raw: string | null | undefined): ClassifiedLink {
  const norm = normalizeInternal(raw);
  if (!norm) {
    const r: ClassifiedLink = {
      kind: "other", url: null, host: null,
      confidence: "unknown", wasUnwrapped: false, hadTracking: false,
    };
    recordMetric(r);
    return r;
  }

  const { url, wasUnwrapped, hadTracking } = norm;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const href = url.toString();
  const confidence: LinkConfidence = wasUnwrapped ? "inferred" : "confirmed";

  let kind: LinkKind = "site";
  if (isInstagramHost(host)) kind = "instagram";
  else if (isFacebookHost(host)) kind = "facebook";

  const r: ClassifiedLink = { kind, url: href, host, confidence, wasUnwrapped, hadTracking };
  recordMetric(r);
  return r;
}

/**
 * Conveniência: `true` quando o link é um site real (não rede social).
 * Usado para decidir se o botão "Auditar" deve aparecer.
 */
export function isRealSite(raw: string | null | undefined): boolean {
  return classifyLink(raw).kind === "site";
}
