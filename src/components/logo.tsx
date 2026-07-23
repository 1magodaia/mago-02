interface LogoProps {
  className?: string;
  monochrome?: boolean;
}

export function LogoIcon({ className = "h-8 w-8", monochrome = false }: LogoProps) {
  const color = monochrome ? "currentColor" : "#00FF41";
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="13" cy="14" r="8" stroke={color} strokeWidth="2.25" />
      <line
        x1="19.2"
        y1="20.2"
        x2="26.5"
        y2="27.5"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M23 3 L24.1 6.4 L27.5 7.5 L24.1 8.6 L23 12 L21.9 8.6 L18.5 7.5 L21.9 6.4 Z"
        fill={color}
      />
    </svg>
  );
}

export function LogoWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoIcon className="h-8 w-8" />
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-extrabold tracking-tight text-foreground">Busca</span>
        <span className="text-lg font-extrabold tracking-tight text-primary">Mágica</span>
      </div>
    </div>
  );
}
