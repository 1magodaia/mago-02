import { memo, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { LogoIcon } from "@/components/logo";

// Cache de URLs já carregadas com sucesso nesta sessão — evita flash e re-download.
const LOADED_URLS = new Set<string>();

type Props = {
  url: string;
  fit: "cover" | "contain";
  heightMobile: number;
  heightDesktop: number;
};

/**
 * Hero premium: a imagem é apenas ilustração de fundo (mago/roxo/dourado).
 * Todo o texto — título, slogan, tagline — é HTML real sobreposto via CSS.
 * Nenhum número inventado. Se um dia tivermos contagem real de leads
 * auditados no banco, podemos plugar aqui sem regenerar a arte.
 */
function HeroBannerBase({ url, fit, heightMobile, heightDesktop }: Props) {
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(() => !url || LOADED_URLS.has(url));

  useEffect(() => {
    setError(false);
    setReady(!url || LOADED_URLS.has(url));
  }, [url]);

  return (
    <section
      className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-primary/25 via-background to-accent/20 ring-1 ring-border shadow-elevated"
      style={{
        ["--hero-h-mobile" as string]: `${heightMobile}px`,
        ["--hero-h-desktop" as string]: `${heightDesktop}px`,
      }}
    >
      <style>{`
        .bm-hero-grid { min-height: var(--hero-h-mobile); }
        @media (min-width: 640px){ .bm-hero-grid{ min-height: var(--hero-h-desktop); } }
      `}</style>

      <div className="bm-hero-grid grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,45%)]">
        {/* Coluna de texto — nunca sobreposta à arte */}
        <div className="relative z-10 flex flex-col justify-center px-5 py-8 sm:px-10 sm:py-12">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent ring-1 ring-accent/30">
            <Sparkles className="h-3 w-3" />
            Prospecção inteligente
          </div>

          <h1 className="mt-3 flex items-center gap-3 text-3xl font-black tracking-tight text-foreground sm:text-5xl">
            <LogoIcon className="h-9 w-9 shrink-0 text-primary drop-shadow-[0_0_24px_var(--primary)] sm:h-12 sm:w-12" />
            <span>
              Busca <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">Mágica</span>
            </span>
          </h1>

          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Encontre comércios que precisam de você <strong className="text-foreground">antes</strong> da concorrência.
            Auditoria digital em segundos: site, WhatsApp, Instagram, CNPJ e faixa de preço — tudo verificado.
          </p>
        </div>

        {/* Coluna de imagem — arte inteira, sem corte no rosto */}
        <div className="relative min-h-[220px] sm:min-h-0">
          {url && !error ? (
            <>
              <img
                src={url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full transition-opacity duration-500"
                style={{
                  objectFit: "contain",
                  objectPosition: "center",
                  opacity: ready ? 1 : 0,
                }}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                onLoad={() => {
                  LOADED_URLS.add(url);
                  setReady(true);
                }}
                onError={() => setError(true)}
              />
              {!ready && (
                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-primary/20 via-background to-accent/20" />
              )}
            </>
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/25 via-background to-accent/20" />
          )}
          {/* Fade suave só na borda esquerda em desktop — nunca cobre o mago */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 hidden w-16 bg-gradient-to-r from-background to-transparent sm:block"
          />
        </div>
      </div>
    </section>
  );
}

export const HeroBanner = memo(HeroBannerBase);
