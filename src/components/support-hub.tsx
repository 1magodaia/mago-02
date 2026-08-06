import { useState, useEffect } from "react";
import { MessageCircle, MessageSquare, X, Info } from "lucide-react";
import { SupportChat } from "./support-chat";
import { SupportWidget, SupportWidgetFallback } from "./support-widget";
import { cn } from "@/lib/utils";

export function SupportHub() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"none" | "chat" | "whatsapp">("none");

  useEffect(() => {
    if (activeTab !== "none") {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") setActiveTab("none");
      };
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [activeTab]);

  return (
    <div className="fixed right-4 z-[100] sm:right-6" style={{ bottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="relative flex flex-col items-end gap-3 pb-4">
        
        {isOpen && (
          <div className="flex flex-col items-end gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-popover px-2 py-1 text-xs font-medium text-foreground shadow-sm border border-border">
                WhatsApp
              </span>
              <button
                onClick={() => {
                  setActiveTab(activeTab === "whatsapp" ? "none" : "whatsapp");
                  setIsOpen(false);
                }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
              >
                <MessageCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-popover px-2 py-1 text-xs font-medium text-foreground shadow-sm border border-border">
                Chat IA
              </span>
              <button
                onClick={() => {
                  setActiveTab(activeTab === "chat" ? "none" : "chat");
                  setIsOpen(false);
                }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 active:scale-95"
              >
                <MessageSquare className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) setActiveTab("none");
          }}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 ring-4 ring-primary/20",
            isOpen ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
          )}
        >
          {isOpen ? <X className="h-6 w-6" /> : (
            <div className="relative">
              <MessageSquare className="h-6 w-6" />
              <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-gold text-[10px] font-black text-black ring-2 ring-primary shadow-sm">
                <Info className="h-3 w-3" strokeWidth={3} />
              </div>
            </div>
          )}
        </button>
      </div>

      <div className={cn("contents", activeTab !== "chat" && "hidden")}>
        <SupportChat standalone={false} onClose={() => setActiveTab("none")} />
      </div>
      <div className={cn("contents", activeTab !== "whatsapp" && "hidden")}>
        <div suppressHydrationWarning>
          <SupportWidget standalone={false} onClose={() => setActiveTab("none")} />
        </div>
      </div>
    </div>
  );
}
