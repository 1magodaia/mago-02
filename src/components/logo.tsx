const NEW_LOGO_URL = "https://juhfpndomqvdqxmasssi.supabase.co/storage/v1/object/sign/past/b54cd6fc-fef2-4b9a-a779-3b97246162b7.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81OTJhNTMxZS05YzA2LTRkNDEtYjU1NC1iZDRkNjY3ZDZiYjEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYXN0L2I1NGNkNmZjLWZlZjItNGI5YS1hNzc5LTNiOTcyNDYxNjJiNy5wbmciLCJzY29wZSI6ImRvd25sb2FkIiwiaWF0IjoxNzg1OTc4NTI5LCJleHAiOjE3ODU5ODIxMjl9.DHaQqVQgzbBiBQOqNAXJnUITa1_-aDrnZEw7OIOjfVI";


interface LogoProps {
  className?: string;
  /** kept for API compat with older callers; ignored for the raster brand mark */
  monochrome?: boolean;
}

export function LogoIcon({ className = "h-12 w-12" }: LogoProps) {
  return (
    <img
      src={NEW_LOGO_URL}
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
        src={NEW_LOGO_URL}
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
