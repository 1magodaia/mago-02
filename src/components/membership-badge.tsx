import { Shield, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface MembershipBadgeProps {
  className?: string;
  showBenefits?: () => void;
}

export function MembershipBadge({ className, showBenefits }: MembershipBadgeProps) {
  const { isPro, isAdmin, isMaster } = useAuth();
  const isPaid = isPro || isAdmin || isMaster;

  return (
    <div id="membership-badge" className={cn("flex items-center gap-2", className)}>
      <div 

        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 transition-all",
          isPaid 
            ? "bg-primary/20 text-primary ring-primary/40 shadow-glow-primary" 
            : "bg-muted text-muted-foreground ring-border"
        )}
      >
        {isPaid ? (
          <ShieldCheck className="h-3 w-3" />
        ) : (
          <Shield className="h-3 w-3" />
        )}
        <span>Plano {isPaid ? "Pro" : "Free"}</span>
      </div>
      
      {!isPaid && showBenefits && (
        <button
          onClick={showBenefits}
          className="flex items-center gap-1 text-[10px] font-bold uppercase text-primary underline-offset-4 hover:underline"
        >
          <Zap className="h-3 w-3 animate-pulse" />
          Ver Benefícios
        </button>
      )}
    </div>
  );
}
