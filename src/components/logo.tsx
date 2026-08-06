import { useEffect, useState } from "react";
import { getAppSettings } from "@/lib/settings.functions";
import logoIcon from "../assets/logo-icon.png.asset.json";
import logoFixed from "../assets/logo-fixed.png.asset.json";
import logoFull from "../assets/logo-full.png.asset.json";

interface LogoProps {
  className?: string;
  /** kept for API compat with older callers; ignored for the raster brand mark */
  monochrome?: boolean;
}

export function LogoIcon({ className = "h-12 w-12" }: LogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Tenta carregar do localStorage primeiro para resposta rápida
    const cached = localStorage.getItem("bm.logo_url");
    if (cached) setLogoUrl(cached);

    // Depois busca do servidor para garantir que está atualizado
    getAppSettings().then(settings => {
      if (settings.logo_url !== cached) {
        setLogoUrl(settings.logo_url);
        if (settings.logo_url) {
          localStorage.setItem("bm.logo_url", settings.logo_url);
        } else {
          localStorage.removeItem("bm.logo_url");
        }
      }
    }).catch(console.error);
  }, []);

  // Fallback para a URL hardcoded se nenhuma outra estiver disponível e for a oficial do projeto
  const defaultLogoUrl = "https://juhfpndomqvdqxmasssi.supabase.co/storage/v1/object/sign/past/a3b2f739-9749-41b5-8424-006ec53ad2d7.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81OTJhNTMxZS05YzA2LTRkNDEtYjU1NC1iZDRkNjY3ZDZiYjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYXN0L2EzYjJmNzM5LTk3NDktNDFiNS04NDI0LTAwNmVjNTNhZDJkNy5wbmciLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzg1OTg5MTgzLCJleHAiOjE3ODU5OTI3ODN9.__XKav0p1-R-xrdBznz7nRMjJSdb0mdabVvGrnpLLV8";
  
  const finalLogoUrl = logoUrl || defaultLogoUrl;

  return (
    <div className={`relative group ${className}`}>
      {/* Efeito de brilho pulsante atrás da logo */}
      <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full animate-pulse group-hover:bg-primary/50 transition-all duration-1000" />
      <img
        src={finalLogoUrl || logoIcon.url}
        alt="Busca Mágica"
        className="relative z-10 h-full w-full object-contain drop-shadow-[0_0_20px_rgba(124,92,255,0.4)] transition-all duration-700 group-hover:scale-105 group-hover:drop-shadow-[0_0_35px_rgba(124,92,255,0.6)]"
        draggable={false}
      />
    </div>
  );
}

export function LogoWordmark({
  className = "",
  variant = "compact",
}: {
  className?: string;
  variant?: "compact" | "full";
}) {
  if (variant === "full") {
    return (
      <div className="flex flex-col items-center gap-4">
        <LogoIcon className="h-24 w-24 sm:h-32 sm:w-32" />
        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground drop-shadow-sm">Busca</span>
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-primary drop-shadow-glow-primary">Mágica</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <LogoIcon className="h-12 w-12 sm:h-16 sm:w-16" />
      <div className="flex items-baseline gap-1">
        <span className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground">Busca</span>
        <span className="text-xl sm:text-3xl font-extrabold tracking-tight text-primary drop-shadow-glow-primary">Mágica</span>
      </div>
    </div>
  );
}
