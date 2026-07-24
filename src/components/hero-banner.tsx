import { memo, useEffect, useState } from "react";
import { LogoIcon } from "@/components/logo";

// Cache de URLs já carregadas com sucesso nesta sessão — evita flash e re-download.
const LOADED_URLS = new Set<string>();

type Props = {
  url: string;
  fit: "cover" | "contain";
  heightMobile: number;
  heightDesktop: number;
};

function HeroBannerBase({ url, fit, heightMobile, heightDesktop }: Props) {
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(() => !url || LOADED_URLS.has(url));

  useEffect(() => {
    setError(false);
    setReady(!url || LOADED_URLS.has(url));
  }, [url]);


  return (
    <div className="relative overflow-hidden rounded-3xl bg-glass ring-1 ring-border shadow-elevated">
      {url && !error ? (
        <>
          <img
            src={url}
            alt="Busca Mágica — o buscador inteligente que encontra clientes para você"
            className="block h-auto w-full transition-opacity duration-300"
            style={{ opacity: ready ? 1 : 0 }}
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
            <div
              className="absolute inset-0 animate-pulse bg-gradient-to-br from-primary/10 via-background to-accent/10"
              style={{ minHeight: heightMobile }}
            />
          )}
        </>
      ) : (
        <div
          className="flex w-full items-center justify-center bg-gradient-to-br from-primary/15 via-background to-accent/15"
          style={{ minHeight: heightMobile }}
        >
          <div className="flex items-center gap-3 text-center">
            <LogoIcon className="h-10 w-10 text-primary" />
            <div>
              <div className="text-lg font-black tracking-tight">Busca Mágica</div>
              <div className="text-xs text-muted-foreground">
                {error ? "Não foi possível carregar o banner." : "Configure um banner no painel master."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const HeroBanner = memo(HeroBannerBase);
