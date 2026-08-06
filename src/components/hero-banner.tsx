import { memo, useEffect, useRef, useState } from "react";
import { Play, Info } from "lucide-react";

// Cache de URLs já carregadas com sucesso nesta sessão — evita flash e re-download.
const LOADED_URLS = new Set<string>();

const BRAND_VIDEO_URL = "https://juhfpndomqvdqxmasssi.supabase.co/storage/v1/object/sign/past/Anime_mago_globe_business_1080p_202608052205.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81OTJhNTMxZS05YzA2LTRkNDEtYjU1NC1iZDRkNjY3ZDZiYjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYXN0L0FuaW1lX21hZ29fZ2xvYmVfYnVzaW5lc3NfMTA4MHBfMjAyNjA4MDUyMjA1Lm1wNCIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3ODU5ODEwMzAsImV4cCI6MTc4NTk4NDYzMH0.fxtt-D291M9_Wc96lCIuzjmA0ogDpzHd34OKiGr1RqA";

type Props = {
  url: string;
  fit: "cover" | "contain";
  heightMobile: number;
  heightDesktop: number;
};

/**
 * Hero: exibe a arte oficial e um teaser de vídeo "Como funciona" (Mago IA).
 */
function HeroBannerBase({ url, fit, heightMobile, heightDesktop }: Props) {
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(() => !url || LOADED_URLS.has(url));
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setError(false);
    setReady(!url || LOADED_URLS.has(url));
  }, [url]);

  return (
    <section
      className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-primary/25 via-background to-accent/20 ring-1 ring-border shadow-elevated transition-transform duration-500 hover:scale-[1.005]"
      style={{
        ["--hero-h-mobile" as string]: `${heightMobile}px`,
        ["--hero-h-desktop" as string]: `${heightDesktop}px`,
        ["--hero-fit-desktop" as string]: fit,
      }}
    >
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-background/60 via-transparent to-background/20 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 z-[1] h-24 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />
      <div className="absolute inset-0 z-0 bg-primary/5 animate-pulse mix-blend-overlay" />

      {/*
        Mobile: força object-fit:contain — em telas estreitas "cover" corta
        a face do mago e/ou o texto do flyer. Desktop respeita a preferência
        configurada no /master (cover ou contain).
      */}
      <style>{`
        .bm-hero-wrap { height: var(--hero-h-mobile); }
        .bm-hero-img { object-fit: contain; }
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
              <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-primary/20 via-background to-accent/20" />
            )}
          </>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/25 via-background to-accent/20" />
        )}
      </div>

      {/* Video Teaser Overlay */}
      {!showVideo ? (
        <button 
          onClick={() => setShowVideo(true)}
          className="absolute bottom-4 right-4 z-[10] flex items-center gap-2 rounded-full bg-primary/90 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white shadow-glow-primary backdrop-blur-md transition-all hover:scale-105 active:scale-95"
        >
          <Play className="h-3 w-3 fill-current" />
          Como funciona
        </button>
      ) : (
        <div className="absolute inset-0 z-[20] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
          <button 
            onClick={() => setShowVideo(false)}
            className="absolute right-4 top-4 z-[30] rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <Info className="h-5 w-5 rotate-45" />
          </button>
          <video 
            ref={videoRef}
            src={BRAND_VIDEO_URL} 
            autoPlay 
            controls 
            className="max-h-full max-w-full rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </section>
  );
}

export const HeroBanner = memo(HeroBannerBase);
