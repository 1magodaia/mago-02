import { useEffect, useState } from "react";
import { getAppSettings } from "@/lib/settings.functions";
import logoIcon from "../assets/logo-icon.png.asset.json";
import logoWizard from "../assets/logo-wizard.png.asset.json";
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

  // Fallback para a URL do asset carregado se nenhuma outra estiver disponível no DB/Local
  const defaultLogoUrl = logoWizard.url;
  
  const finalLogoUrl = logoUrl || defaultLogoUrl;

  return (
    <div className={`relative group ${className}`}>
      {/* Efeito de brilho pulsante atrás da logo — roxo da marca */}
      <div className="absolute inset-0 bg-brand/30 blur-2xl rounded-full animate-pulse group-hover:bg-brand/50 transition-all duration-1000" />
      <img
        src={finalLogoUrl || logoIcon.url}
        alt="Busca Mágica"
        className="relative z-10 h-full w-full object-contain drop-shadow-[0_0_20px_rgba(124,92,255,0.45)] transition-all duration-700 group-hover:scale-105 group-hover:drop-shadow-[0_0_35px_rgba(124,92,255,0.65)]"
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
      <div className="flex flex-col items-center gap-2">
        <LogoIcon className="h-40 w-40 sm:h-56 sm:w-56" />
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-4xl sm:text-6xl font-black tracking-tighter text-foreground drop-shadow-sm">Busca</span>
          <span className="text-4xl sm:text-6xl font-black tracking-tighter text-primary drop-shadow-glow-primary">Mágica</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoIcon className="h-10 w-10 sm:h-12 sm:w-12" />
      <div className="flex items-baseline gap-1">
        <span className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground">Busca</span>
        <span className="text-xl sm:text-3xl font-extrabold tracking-tight text-primary drop-shadow-glow-primary">Mágica</span>
      </div>
    </div>
  );
}
