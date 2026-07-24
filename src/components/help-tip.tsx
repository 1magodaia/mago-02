import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface HelpTipProps {
  /** Explicação curta em linguagem simples. */
  text: string;
  /** Título opcional (bold no topo do popover). */
  title?: string;
  /** Rótulo acessível para o botão (aria-label). Default: "Ajuda". */
  label?: string;
  className?: string;
  /** Tamanho do ícone em px. Default 12. */
  size?: number;
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * Ícone "?" reutilizável.
 * - Hover no desktop mostra tooltip nativo (title).
 * - Clique/tap abre popover (mobile-friendly).
 * Puramente informativo: não altera lógica nem estado da tela.
 */
export function HelpTip({
  text,
  title,
  label = "Ajuda",
  className,
  size = 12,
  side = "top",
}: HelpTipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={text}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring align-middle",
            className,
          )}
        >
          <HelpCircle style={{ width: size, height: size }} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align="center"
        onClick={(e) => e.stopPropagation()}
        className="w-64 text-[11px] leading-relaxed"
      >
        {title && <div className="mb-1 text-xs font-bold text-foreground">{title}</div>}
        <p className="text-muted-foreground">{text}</p>
      </PopoverContent>
    </Popover>
  );
}
