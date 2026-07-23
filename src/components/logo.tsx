import logoIcon from "../assets/logo-icon.png.asset.json";
import logoFull from "../assets/logo-full.png.asset.json";

interface LogoProps {
  className?: string;
  /** kept for API compat with older callers; ignored for the raster brand mark */
  monochrome?: boolean;
}

export function LogoIcon({ className = "h-8 w-8" }: LogoProps) {
  return (
    <img
      src={logoIcon.url}
      alt="Busca Mágica"
      className={className}
      draggable={false}
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
      <img
        src={logoFull.url}
        alt="Busca Mágica"
        className={className || "h-10 w-auto"}
        draggable={false}
      />
    );
  }
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoIcon className="h-9 w-9" />
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-extrabold tracking-tight text-foreground">Busca</span>
        <span className="text-lg font-extrabold tracking-tight text-primary">Mágica</span>
      </div>
    </div>
  );
}
