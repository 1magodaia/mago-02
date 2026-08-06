import React, { useState, useEffect } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingStep {
  targetId: string;
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    targetId: "membership-badge",
    title: "Seu Plano",
    description: "Aqui você vê se é Free ou Pro. Toque para ver os benefícios de cada um.",
    position: "bottom"
  },
  {
    targetId: "search-input",
    title: "Busca Inteligente",
    description: "Digite o que procura e onde. Usuários Pro têm buscas ilimitadas!",
    position: "bottom"
  },
  {
    targetId: "pro-upgrade-link",
    title: "Vire Pro",

    description: "Desbloqueie extração de e-mails, exportação CSV e muito mais.",
    position: "top"
  }
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem('bm.hasSeenOnboarding_v1');
    if (!hasSeen) {
      // Pequeno delay para garantir que o DOM carregou e a animação inicial do logo terminou
      const timer = setTimeout(() => {
        setOpen(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem('bm.hasSeenOnboarding_v1', 'true');
  };

  if (!open) return null;

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={open}>
        <TooltipTrigger asChild>
          <div 
            id={`onboarding-anchor-${currentStep}`}
            className="fixed pointer-events-none z-[9999]"
            style={getAnchorStyle(step.targetId)}
          />
        </TooltipTrigger>
        <TooltipContent 
          side={step.position} 
          className="max-w-[280px] p-4 bg-DeepNight border border-primary/40 text-foreground shadow-glow-primary"
          sideOffset={10}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-wider text-[10px]">
              <Sparkles className="h-3 w-3" />
              <span>Dica Mágica ({currentStep + 1}/{ONBOARDING_STEPS.length})</span>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-1">{step.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
            <div className="flex justify-between items-center pt-2">
              <button 
                onClick={handleClose}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors uppercase font-bold"
              >
                Pular
              </button>
              <Button 
                size="sm" 
                onClick={handleNext}
                className="h-7 px-3 text-[10px] font-black uppercase tracking-tight"
              >
                {currentStep === ONBOARDING_STEPS.length - 1 ? "Começar" : "Próximo"}
              </Button>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getAnchorStyle(targetId: string): React.CSSProperties {
  if (typeof document === 'undefined') return {};
  const el = document.getElementById(targetId);
  if (!el) return { top: '50%', left: '50%' };

  const rect = el.getBoundingClientRect();
  return {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
}
