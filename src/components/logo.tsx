import { useState } from "react";
import { cn } from "@/lib/utils";

const NEW_LOGO_URL = "https://juhfpndomqvdqxmasssi.supabase.co/storage/v1/object/sign/past/a3b2f739-9749-41b5-8424-006ec53ad2d7.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81OTJhNTMxZS05YzA2LTRkNDEtYjU1NC1iZDRkNjY3ZDZiYjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYXN0L2EzYjJmNzM5LTk3NDktNDFiNS04NDI0LTAwNmVjNTNhZDJkNy5wbmciLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzg1OTgzNzIzLCJleHAiOjE3ODU5ODczMjN9.X-N1BCPWQ1z1oRgniCe1WA7XZgFTmWk2UtG1aaWi9mQ";

interface LogoProps {
  className?: string;
  /** kept for API compat with older callers; ignored for the raster brand mark */
  monochrome?: boolean;
}

function EnhancedLogoImg({ 
  src, 
  alt, 
  className,
  animate = true 
}: { 
  src: string; 
  alt: string; 
  className?: string;
  animate?: boolean;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={cn(
      "relative overflow-hidden transition-all duration-700", 
      !isLoaded && "blur-md scale-95 opacity-50",
      isLoaded && animate && "magical-pulse",
      className
    )}>
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        className={cn(
          "h-full w-full object-contain transition-all duration-1000 ease-out",
          isLoaded ? "blur-0 scale-100 opacity-100" : "blur-lg scale-90 opacity-0"
        )}
        style={{
          filter: isLoaded ? "drop-shadow(0 0 15px rgba(107, 70, 224, 0.4))" : "none"
        }}
        draggable={false}
      />
    </div>
  );
}

export function LogoIcon({ className = "h-12 w-12", animate = true }: LogoProps & { animate?: boolean }) {
  return (
    <EnhancedLogoImg
      src={NEW_LOGO_URL}
      alt="Busca Magica"
      className={className}
      animate={animate}
    />
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
      <EnhancedLogoImg
        src={NEW_LOGO_URL}
        alt="Busca Magica"
        className={className || "h-24 w-auto"}
      />
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoIcon className="h-12 w-12 sm:h-14 sm:w-14" />
      <div className="flex items-baseline gap-1">
        <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">Busca</span>
        <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-primary">Magica</span>
      </div>
    </div>
  );
}
