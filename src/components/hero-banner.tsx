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
        // Altura responsiva controlada pelo painel master.
        ["--hero-h-mobile" as string]: `${heightMobile}px`,
        ["--hero-h-desktop" as string]: `${heightDesktop}px`,
      }}
    >
      {/* Camada de imagem — apenas ilustração, sem texto pintado */}
      <div className="absolute inset-0 -z-10">
        {url && !error ? (
          <>
            <img
              src={url}
              alt=""
              aria-hidden="true"
              className="h-full w-full transition-opacity duration-500"
              style={{
                objectFit: fit,
                objectPosition: "center right",
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
        {/* Vinheta para garantir contraste do texto sobre qualquer imagem */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/10 sm:from-background/90 sm:via-background/55 sm:to-transparent"
        />
      </div>

      {/* Camada de conteúdo — texto real, indexável, editável */}
      <div
        className="relative flex flex-col justify-center px-5 py-8 sm:px-10 sm:py-12"
        style={{
          minHeight: "var(--hero-h-mobile)",
        }}
      >
        <style>{`@media (min-width: 640px){ .bm-hero-inner{ min-height: var(--hero-h-desktop); } }`}</style>
        <div className="bm-hero-inner flex flex-col justify-center">
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
      </div>
    </section>
  );
}

export const HeroBanner = memo(HeroBannerBase);
