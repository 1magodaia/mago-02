import logoIcon from "../assets/logo-icon.png.asset.json";
import logoFull from "../assets/logo-full.png.asset.json";

interface LogoProps {
  className?: string;
  /** kept for API compat with older callers; ignored for the raster brand mark */
  monochrome?: boolean;
}

export function LogoIcon({ className = "h-12 w-12" }: LogoProps) {
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
        className={className || "h-24 w-auto"}
        draggable={false}
      />
    );
  }
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoIcon className="h-12 w-12 sm:h-14 sm:w-14" />
      <div className="flex items-baseline gap-1">
        <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">Busca</span>
        <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-primary">Mágica</span>
      </div>
    </div>
  );
}
