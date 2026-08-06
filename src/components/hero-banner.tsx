import { memo, useEffect, useState } from "react";

// Cache de URLs já carregadas com sucesso nesta sessão — evita flash e re-download.
const LOADED_URLS = new Set<string>();

type Props = {
  url: string;
  fit: "cover" | "contain";
  heightMobile: number;
  heightDesktop: number;
};

/**
 * Hero: exibe apenas a arte oficial (flyer) sem textos sobrepostos.
 * A arte já contém a identidade da marca; qualquer texto adicional
 * conflita com o próprio flyer e foi removido por pedido do usuário.
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
      className="relative isolate overflow-hidden rounded-3xl bg-black ring-1 ring-border shadow-elevated"
      style={{
        ["--hero-h-mobile" as string]: `${heightMobile}px`,
        ["--hero-h-desktop" as string]: `${heightDesktop}px`,
        ["--hero-fit-desktop" as string]: fit,
      }}
    >
      {/*
        Mobile: força object-fit:contain — em telas estreitas "cover" corta
        a face do mago e/ou o texto do flyer. Desktop respeita a preferência
        configurada no /master (cover ou contain).
      */}
      <style>{`
        .bm-hero-wrap { height: var(--hero-h-mobile); }
        .bm-hero-img { object-fit: contain; background: #000; }
        /* Mobile em paisagem: reduz o hero para não sobrepor busca/CTA */
        @media (max-width: 767px) and (orientation: landscape){
          .bm-hero-wrap { height: min(60vh, calc(var(--hero-h-mobile) * 0.6)); }
        }
        @media (min-width: 640px){
          .bm-hero-wrap { height: var(--hero-h-desktop); }
          .bm-hero-img { object-fit: var(--hero-fit-desktop); }
        }
      `}</style>

      <div className="bm-hero-wrap relative w-full">
        {url && !error ? (
          <>
            <img
              src={url}
              alt="Busca Mágica"
              className="bm-hero-img absolute inset-0 h-full w-full transition-opacity duration-500"
              style={{
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
              <div className="absolute inset-0 animate-pulse bg-black" />
            )}
          </>
        ) : (
          <div className="h-full w-full bg-black" />
        )}
      </div>
    </section>
  );
}

export const HeroBanner = memo(HeroBannerBase);
