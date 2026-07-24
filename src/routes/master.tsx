import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Ban,
  Check,
  Download,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  MessageCircle,
  Monitor,
  RotateCcw,
  Save,
  Shield,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";

import { LogoWordmark } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import {
  listUsers,
  sendPasswordReset,
  grantProAccess,
  setUserStatus,
  type AdminUserRow,
} from "@/lib/admin.functions";
import { getAppSettings, updateAppSettings, listWhatsappChangeLog, exportWhatsappChangeLogCsv, type WhatsappChangeLogEntry } from "@/lib/settings.functions";
import { getCitationCostStats, type CitationCostStats } from "@/lib/citations.functions";
import { HelpTip } from "@/components/help-tip";


function HeroPlaceholder({ tone }: { tone: "empty" | "warn" | "error" }) {
  const label =
    tone === "error"
      ? "Não foi possível carregar essa imagem."
      : tone === "warn"
      ? "URL inválida — use https://..."
      : "Sem banner configurado.";
  const hint =
    tone === "error"
      ? "Verifique o link ou tente outra URL."
      : tone === "warn"
      ? "Cole uma URL http(s) pública."
      : "Cole uma URL acima para pré-visualizar.";
  const ring =
    tone === "error"
      ? "ring-destructive/40"
      : tone === "warn"
      ? "ring-warn/40"
      : "ring-border";
  return (
    <div className={`grid h-full w-full place-items-center bg-gradient-to-br from-primary/10 via-background to-accent/10 ring-1 ${ring}`}>
      <div className="flex items-center gap-3 px-4 text-center">
        <ImageIcon className="h-6 w-6 text-primary" />
        <div>
          <div className="text-xs font-bold">{label}</div>
          <div className="text-[10px] text-muted-foreground">{hint}</div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/master")({
  head: () => ({
    meta: [
      { title: "Painel Master — Busca Mágica" },
      { name: "description", content: "Painel de administração restrito." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Busca Mágica — Painel Master" },
      { property: "og:description", content: "Área administrativa restrita." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MasterPanel,
});

function MasterPanel() {
  const { loading, user, isAdmin, isMaster } = useAuth();
  const nav = useNavigate();
  const list = useServerFn(listUsers);
  const grantAccess = useServerFn(grantProAccess);
  const setStatus = useServerFn(setUserStatus);
  const resetPwd = useServerFn(sendPasswordReset);
  const readSettings = useServerFn(getAppSettings);
  const writeSettings = useServerFn(updateAppSettings);
  const readCostStats = useServerFn(getCitationCostStats);
  const readWaLog = useServerFn(listWhatsappChangeLog);
  const exportWaCsv = useServerFn(exportWhatsappChangeLogCsv);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [supportWa, setSupportWa] = useState("");
  const [supportMsg, setSupportMsg] = useState("");
  const [citationsEnabled, setCitationsEnabled] = useState(false);
  const [citationsLimit, setCitationsLimit] = useState(20);
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [heroHeightDesktop, setHeroHeightDesktop] = useState(320);
  const [heroHeightMobile, setHeroHeightMobile] = useState(200);
  const [heroFit, setHeroFit] = useState<"cover" | "contain">("cover");
  const [heroPreviewStatus, setHeroPreviewStatus] = useState<"idle" | "loading" | "ok" | "invalid" | "error">("idle");
  const [heroPreviewDevice, setHeroPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [heroBusy, setHeroBusy] = useState(false);

  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [costStats, setCostStats] = useState<CitationCostStats | null>(null);
  const [waLog, setWaLog] = useState<WhatsappChangeLogEntry[]>([]);
  const [waLogTotal, setWaLogTotal] = useState(0);
  const [waLogPage, setWaLogPage] = useState(1);
  const [waLogPageSize] = useState(10);
  const [waLogAuthor, setWaLogAuthor] = useState("");
  const [waLogFrom, setWaLogFrom] = useState("");
  const [waLogTo, setWaLogTo] = useState("");
  const [waLogBusy, setWaLogBusy] = useState(false);
  const [waLogExporting, setWaLogExporting] = useState(false);
  const [reason, setReason] = useState("");



  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav({ to: "/auth", search: { redirect: "/master" } });
      return;
    }
    if (!isAdmin) {
      nav({ to: "/" });
      return;
    }
    setReady(true);
  }, [loading, user, isAdmin, nav]);

  const load = async () => {
    setLoadErr(null);
    try {
      const r = await list();
      setUsers(r.users);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Falha ao carregar.");
    }
  };

  const loadWaLog = async (opts?: { page?: number; author?: string; from?: string; to?: string }) => {
    setWaLogBusy(true);
    try {
      const r = await readWaLog({
        data: {
          author: opts?.author ?? waLogAuthor,
          from: opts?.from ?? waLogFrom,
          to: opts?.to ?? waLogTo,
          page: opts?.page ?? waLogPage,
          pageSize: waLogPageSize,
        },
      });
      setWaLog(r.entries);
      setWaLogTotal(r.total);
    } catch {
      // ignore
    } finally {
      setWaLogBusy(false);
    }
  };

  useEffect(() => {
    if (ready) {
      load();
      readSettings()
        .then((s) => {
          setSupportWa(s.support_whatsapp ?? "");
          setSupportMsg(s.support_message ?? "");
          setCitationsEnabled(s.citations_enabled);
          setCitationsLimit(s.citations_daily_limit);
          setHeroImageUrl(s.hero_image_url ?? "");
          setHeroHeightDesktop(s.hero_height_desktop ?? 320);
          setHeroHeightMobile(s.hero_height_mobile ?? 200);
          setHeroFit(s.hero_fit ?? "cover");
        })
        .catch(() => {});
      readCostStats().then(setCostStats).catch(() => {});
      loadWaLog({ page: 1 });
    }


    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);


  // Normaliza para dígitos (aceita "+" apenas no início) e formata visualmente como +DDI (DD) NNNNN-NNNN
  const normalizeWa = (raw: string): string => {
    const hasPlus = raw.trim().startsWith("+");
    const digits = raw.replace(/\D/g, "").slice(0, 15);
    return (hasPlus && digits ? "+" : "") + digits;
  };
  const waDigits = supportWa.replace(/\D/g, "");
  const waValid = waDigits === "" || (waDigits.length >= 10 && waDigits.length <= 15);
  const waHint = supportWa === ""
    ? "Deixe em branco para ocultar o widget."
    : waValid
      ? `Será salvo como ${waDigits} (${waDigits.length} dígitos).`
      : "Formato inválido. Use DDI + DDD + número (10 a 15 dígitos). Ex.: 5511999998888.";

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waValid) {
      setSettingsError("Número de WhatsApp inválido. Use DDI + DDD + número (10 a 15 dígitos).");
      return;
    }
    setSettingsBusy(true);
    setSettingsError(null);
    try {
      const r = await writeSettings({
        data: {
          support_whatsapp: waDigits || null,
          support_message: supportMsg || null,
          citations_enabled: citationsEnabled,
          citations_daily_limit: citationsLimit,
          reason: reason.trim() || null,
        },
      });
      setSupportWa(r.support_whatsapp ?? "");
      setSupportMsg(r.support_message ?? "");
      setCitationsEnabled(r.citations_enabled);
      setCitationsLimit(r.citations_daily_limit);
      setNotice("Configurações atualizadas.");
      setReason("");
      setWaLogPage(1);
      loadWaLog({ page: 1 });
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSettingsBusy(false);
    }
  };


  const toggleCitations = async (next: boolean) => {
    setCitationsEnabled(next);
    setSettingsBusy(true);
    try {
      const r = await writeSettings({ data: { citations_enabled: next } });
      setCitationsEnabled(r.citations_enabled);
      setNotice(next ? "Busca de citações ATIVADA para usuários Pro." : "Busca de citações DESLIGADA.");
    } catch (err) {
      setCitationsEnabled(!next);
      setSettingsError(err instanceof Error ? err.message : "Erro ao alternar.");
    } finally {
      setSettingsBusy(false);
    }
  };

  const saveHero = async (e: React.FormEvent) => {
    e.preventDefault();
    setHeroBusy(true);
    setSettingsError(null);
    const tid = toast.loading("Salvando banner...");
    try {
      const r = await writeSettings({
        data: {
          hero_image_url: heroImageUrl.trim() || null,
          hero_height_desktop: heroHeightDesktop,
          hero_height_mobile: heroHeightMobile,
          hero_fit: heroFit,
        },
      });
      setHeroImageUrl(r.hero_image_url ?? "");
      setHeroHeightDesktop(r.hero_height_desktop);
      setHeroHeightMobile(r.hero_height_mobile);
      setHeroFit(r.hero_fit);
      setNotice("Banner atualizado.");
      toast.success("Banner salvo.", { id: tid });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar imagem.";
      setSettingsError(msg);
      toast.error("Falha ao salvar banner.", { id: tid, description: msg });
    } finally {
      setHeroBusy(false);
    }
  };

  // Live preview validation: probe the URL by loading it in a hidden Image
  useEffect(() => {
    const url = heroImageUrl.trim();
    if (!url) { setHeroPreviewStatus("idle"); return; }
    if (!/^https?:\/\/|^\/__l5e\//.test(url)) { setHeroPreviewStatus("invalid"); return; }
    setHeroPreviewStatus("loading");
    const img = new Image();
    let cancelled = false;
    img.onload = () => { if (!cancelled) setHeroPreviewStatus("ok"); };
    img.onerror = () => { if (!cancelled) setHeroPreviewStatus("error"); };
    img.src = url;
    return () => { cancelled = true; };
  }, [heroImageUrl]);


  const performRevert = async (entry: WhatsappChangeLogEntry) => {
    const target = entry.old_whatsapp ?? "";
    const targetMsg = entry.old_message ?? "";
    setSettingsBusy(true);
    setSettingsError(null);
    const tid = toast.loading("Revertendo configuração...");
    try {
      const r = await writeSettings({
        data: {
          support_whatsapp: target || null,
          support_message: targetMsg || null,
          reason: `Revert de ${new Date(entry.created_at).toLocaleString("pt-BR")} (por ${entry.changed_by_email ?? "—"})`,
        },
      });
      setSupportWa(r.support_whatsapp ?? "");
      setSupportMsg(r.support_message ?? "");
      setNotice("Configuração revertida.");
      setWaLogPage(1);
      loadWaLog({ page: 1 });
      toast.success("Configuração revertida.", {
        id: tid,
        description: `WhatsApp: ${target || "(vazio)"}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao reverter.";
      setSettingsError(msg);
      toast.error("Falha ao reverter.", { id: tid, description: msg });
    } finally {
      setSettingsBusy(false);
    }
  };

  const revertWaEntry = (entry: WhatsappChangeLogEntry) => {
    const label = entry.old_whatsapp ? entry.old_whatsapp : "(vazio)";
    toast(`Reverter WhatsApp para "${label}"?`, {
      description: `Alteração de ${new Date(entry.created_at).toLocaleString("pt-BR")} por ${entry.changed_by_email ?? "—"}. Isso será registrado como uma nova mudança.`,
      action: { label: "Reverter", onClick: () => performRevert(entry) },
      cancel: { label: "Cancelar", onClick: () => {} },
      duration: 10000,
    });
  };


  const applyWaFilters = () => {
    setWaLogPage(1);
    loadWaLog({ page: 1 });
  };

  const clearWaFilters = () => {
    setWaLogAuthor("");
    setWaLogFrom("");
    setWaLogTo("");
    setWaLogPage(1);
    loadWaLog({ page: 1, author: "", from: "", to: "" });
  };

  const changeWaPage = (next: number) => {
    setWaLogPage(next);
    loadWaLog({ page: next });
  };

  const downloadWaCsv = async () => {
    setWaLogExporting(true);
    const tid = toast.loading("Gerando CSV...");
    try {
      const { csv } = await exportWaCsv({
        data: { author: waLogAuthor, from: waLogFrom, to: waLogTo },
      });
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = `whatsapp-change-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("CSV exportado.", { id: tid, description: filename });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao exportar CSV.";
      setSettingsError(msg);
      toast.error("Falha ao exportar CSV.", { id: tid, description: msg });
    } finally {
      setWaLogExporting(false);
    }
  };







  type GrantPayload =
    | { userId: string; mode: "free"; reason?: string }
    | { userId: string; mode: "date"; valid_until: string; reason?: string }
    | { userId: string; mode: "searches"; searches_granted: number; reason?: string };

  const grant = async (u: AdminUserRow, payload: GrantPayload) => {
    setBusy(u.id);
    try {
      await grantAccess({ data: payload });
      const nice = payload.mode === "free"
        ? `${u.email} voltou para Free.`
        : payload.mode === "date"
          ? `${u.email} é Pro até ${new Date(payload.valid_until).toLocaleDateString("pt-BR")}.`
          : `${u.email} é Pro com ${payload.searches_granted} buscas.`;
      setNotice(nice);
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Erro.");
    } finally {
      setBusy(null);
    }
  };

  const toggleStatus = async (u: AdminUserRow) => {
    setBusy(u.id);
    try {
      await setStatus({ data: { userId: u.id, status: u.status === "active" ? "blocked" : "active" } });
      setNotice(`${u.email} agora está ${u.status === "active" ? "bloqueado" : "ativo"}.`);
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Erro.");
    } finally {
      setBusy(null);
    }
  };

  const resetPassword = async (u: AdminUserRow) => {
    setBusy(u.id);
    try {
      await resetPwd({ data: { email: u.email } });
      setNotice(`Link de redefinição enviado para ${u.email}.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Erro.");
    } finally {
      setBusy(null);
    }
  };

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6">
      <nav className="mx-auto flex max-w-7xl items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> App
        </Link>
        <LogoWordmark />
      </nav>

      <header className="mx-auto mt-6 flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 ring-1 ring-primary/40">
            {isMaster ? <ShieldCheck className="h-5 w-5 text-primary" /> : <Shield className="h-5 w-5 text-primary" />}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Painel {isMaster ? "Master" : "Admin"}</h1>
            <p className="text-xs text-muted-foreground">Gestão de contas, planos e status.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-glass px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border">
          <Users className="h-3.5 w-3.5 text-primary" /> {users.length} usuários
        </div>
      </header>

      {notice && (
        <div className="mx-auto mt-4 max-w-7xl rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary">
          {notice}
        </div>
      )}
      {loadErr && (
        <div className="mx-auto mt-4 max-w-7xl rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {loadErr}
        </div>
      )}

      {/* SUPORTE / CONTATO — WhatsApp global do app */}
      <section className="glass-panel mx-auto mt-6 max-w-7xl rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#25D366]/15 ring-1 ring-[#25D366]/40">
            <MessageCircle className="h-4 w-4 text-[#25D366]" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Contato do desenvolvedor (WhatsApp)</h2>
            <p className="text-xs text-muted-foreground">
              O número salvo aqui aparece no botão flutuante de suporte em todas as telas do app.
              Use formato internacional só com dígitos (ex: <code>5511999998888</code>).
            </p>
          </div>
        </div>
        <form onSubmit={saveSettings} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">WhatsApp</span>
            <input
              type="tel"
              inputMode="tel"
              placeholder="5511999998888"
              value={supportWa}
              onChange={(e) => setSupportWa(normalizeWa(e.target.value))}
              onBlur={(e) => setSupportWa(normalizeWa(e.target.value))}
              onPaste={(e) => {
                e.preventDefault();
                const txt = e.clipboardData.getData("text");
                setSupportWa(normalizeWa(txt));
              }}
              maxLength={16}
              aria-invalid={!waValid}
              aria-describedby="wa-hint"
              className={`mt-1 w-full rounded-xl bg-glass px-4 py-2.5 text-sm tabular-nums outline-none ring-1 focus:ring-2 ${
                waValid ? "ring-border focus:ring-primary/70" : "ring-destructive/60 focus:ring-destructive"
              }`}
            />
            <p
              id="wa-hint"
              className={`mt-1 text-[10px] ${waValid ? "text-muted-foreground" : "text-destructive"}`}
            >
              {waHint}
            </p>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">Mensagem pré-preenchida</span>
            <input
              type="text"
              placeholder="Olá! Preciso de ajuda com o Busca Mágica."
              value={supportMsg}
              onChange={(e) => setSupportMsg(e.target.value)}
              maxLength={280}
              className="mt-1 w-full rounded-xl bg-glass px-4 py-2.5 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/70"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground inline-flex items-center gap-1">
              Motivo da alteração <span className="text-muted-foreground/70">(opcional, aparece no histórico)</span>
              <HelpTip
                title="Motivo da alteração"
                text="Fica registrado no histórico — ajuda a lembrar por que uma configuração foi trocada, útil se precisar reverter depois."
              />
            </span>
            <input
              type="text"
              placeholder="Ex.: troca de plantonista, número antigo saiu, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              className="mt-1 w-full rounded-xl bg-glass px-4 py-2.5 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/70"
            />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={settingsBusy || !waValid}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
            >
              {settingsBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </button>
          </div>
        </form>

        {settingsError && (
          <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {settingsError}
          </div>
        )}
        {waValid && waDigits && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Preview:{" "}
            <a
              href={`https://wa.me/${waDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              wa.me/{waDigits}
            </a>
          </p>
        )}
      </section>

      {/* HISTÓRICO DE ALTERAÇÕES — WhatsApp de suporte */}
      <section className="glass-panel mx-auto mt-6 max-w-7xl rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/40">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Histórico de alterações do WhatsApp</h2>
              <p className="text-xs text-muted-foreground">
                Filtre por autor e período. Reverta para um estado anterior ou exporte para auditar com o time.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={downloadWaCsv}
            disabled={waLogExporting}
            className="inline-flex items-center gap-2 rounded-xl bg-glass px-3 py-2 text-xs font-semibold ring-1 ring-border hover:bg-primary/10 disabled:opacity-60"
          >
            {waLogExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Exportar CSV
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_160px_160px_auto_auto]">
          <input
            type="text"
            placeholder="Autor (e-mail contém...)"
            value={waLogAuthor}
            onChange={(e) => setWaLogAuthor(e.target.value)}
            className="rounded-xl bg-glass px-3 py-2 text-xs outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/70"
          />
          <input
            type="date"
            value={waLogFrom}
            onChange={(e) => setWaLogFrom(e.target.value)}
            className="rounded-xl bg-glass px-3 py-2 text-xs outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/70"
          />
          <input
            type="date"
            value={waLogTo}
            onChange={(e) => setWaLogTo(e.target.value)}
            className="rounded-xl bg-glass px-3 py-2 text-xs outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/70"
          />
          <button
            type="button"
            onClick={applyWaFilters}
            disabled={waLogBusy}
            className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
          >
            Filtrar
          </button>
          <button
            type="button"
            onClick={clearWaFilters}
            disabled={waLogBusy}
            className="rounded-xl bg-glass px-3 py-2 text-xs font-semibold ring-1 ring-border hover:bg-primary/10 disabled:opacity-60"
          >
            Limpar
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-border">
          {waLog.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              {waLogBusy ? "Carregando..." : "Nenhuma alteração encontrada para o filtro atual."}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-glass text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Quando</th>
                  <th className="px-3 py-2 text-left">Quem</th>
                  <th className="px-3 py-2 text-left">WhatsApp (antes → depois)</th>
                  <th className="px-3 py-2 text-left">Mensagem (antes → depois)</th>
                  <th className="px-3 py-2 text-left">Motivo</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {waLog.map((e) => {
                  const waChanged = (e.old_whatsapp ?? "") !== (e.new_whatsapp ?? "");
                  const msgChanged = (e.old_message ?? "") !== (e.new_message ?? "");
                  const canRevert =
                    (e.old_whatsapp ?? "") !== (supportWa.replace(/\D/g, "") || "") ||
                    (e.old_message ?? "") !== (supportMsg ?? "");
                  return (
                    <tr key={e.id} className="border-t border-border/50 align-top">
                      <td className="px-3 py-2 tabular-nums text-muted-foreground whitespace-nowrap">
                        {new Date(e.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-3 py-2">{e.changed_by_email ?? "—"}</td>
                      <td className="px-3 py-2 font-mono">
                        {waChanged ? (
                          <>
                            <span className="text-destructive line-through">{e.old_whatsapp ?? "∅"}</span>
                            {" → "}
                            <span className="text-primary">{e.new_whatsapp ?? "∅"}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {msgChanged ? (
                          <>
                            <span className="text-destructive line-through">{e.old_message ?? "∅"}</span>
                            {" → "}
                            <span className="text-primary">{e.new_message ?? "∅"}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{e.reason ?? "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => revertWaEntry(e)}
                          disabled={settingsBusy || !canRevert}
                          title={canRevert ? "Reverter para o estado anterior a esta alteração" : "Estado atual já corresponde ao 'antes' deste registro"}
                          className="inline-flex items-center gap-1 rounded-lg bg-glass px-2 py-1 text-[11px] font-semibold ring-1 ring-border hover:bg-primary/10 disabled:opacity-40"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Reverter
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {waLogTotal > waLogPageSize && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              Página {waLogPage} de {Math.max(1, Math.ceil(waLogTotal / waLogPageSize))} · {waLogTotal} registros
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => changeWaPage(Math.max(1, waLogPage - 1))}
                disabled={waLogPage <= 1 || waLogBusy}
                className="rounded-lg bg-glass px-2 py-1 ring-1 ring-border hover:bg-primary/10 disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => changeWaPage(waLogPage + 1)}
                disabled={waLogPage >= Math.ceil(waLogTotal / waLogPageSize) || waLogBusy}
                className="rounded-lg bg-glass px-2 py-1 ring-1 ring-border hover:bg-primary/10 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </section>




      {/* IMAGEM DO HERO — banner topo da home */}
      <section className="glass-panel mx-auto mt-6 max-w-7xl rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/40">
            <ImageIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Imagem do topo (hero)</h2>
            <p className="max-w-2xl text-xs text-muted-foreground">
              Cole a URL pública (https://...) da imagem que aparece no topo da home.
              Deixe em branco para voltar à imagem padrão.
            </p>
          </div>
        </div>
        <form onSubmit={saveHero} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            type="url"
            placeholder="https://..."
            value={heroImageUrl}
            onChange={(e) => setHeroImageUrl(e.target.value)}
            maxLength={2048}
            className="w-full rounded-xl bg-glass px-4 py-2.5 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/70"
          />
          <button
            type="submit"
            disabled={heroBusy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
          >
            {heroBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </button>
        </form>
        <ul className="mt-3 space-y-1 rounded-xl bg-glass/60 p-3 text-[11px] text-muted-foreground ring-1 ring-border">
          <li><strong className="text-foreground">Proporção recomendada:</strong> 16:9 (banner horizontal), ex.: 1920×1080 px.</li>
          <li><strong className="text-foreground">Largura ideal:</strong> 1600–1920 px · <strong className="text-foreground">altura</strong> 600–1080 px.</li>
          <li><strong className="text-foreground">Peso máximo:</strong> ~500 KB · formatos <strong className="text-foreground">.webp</strong>, .jpg ou .png.</li>
          <li><strong className="text-foreground">URL:</strong> https pública (CDN, Imgur, R2, etc.). A imagem ocupa toda a largura do topo.</li>
        </ul>

        {/* Controles de exibição do banner */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="rounded-xl bg-glass/60 p-3 ring-1 ring-border">
            <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
              <span>Altura desktop</span>
              <span className="font-mono text-foreground">{heroHeightDesktop}px</span>
            </div>
            <input
              type="range"
              min={120}
              max={720}
              step={10}
              value={heroHeightDesktop}
              onChange={(e) => setHeroHeightDesktop(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </label>
          <label className="rounded-xl bg-glass/60 p-3 ring-1 ring-border">
            <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
              <span>Altura mobile</span>
              <span className="font-mono text-foreground">{heroHeightMobile}px</span>
            </div>
            <input
              type="range"
              min={100}
              max={480}
              step={10}
              value={heroHeightMobile}
              onChange={(e) => setHeroHeightMobile(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </label>
          <div className="rounded-xl bg-glass/60 p-3 ring-1 ring-border">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Modo de ajuste</div>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setHeroFit("cover")}
                className={`rounded-md px-2 py-1.5 transition ${heroFit === "cover" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Cover
              </button>
              <button
                type="button"
                onClick={() => setHeroFit("contain")}
                className={`rounded-md px-2 py-1.5 transition ${heroFit === "contain" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Contain
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              {heroFit === "cover" ? "Preenche o quadro (pode cortar)." : "Mostra a imagem inteira (pode sobrar espaço)."}
            </p>
          </div>
        </div>

        {/* Prévia ao vivo */}
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>Prévia ao vivo</span>
            {heroPreviewStatus === "loading" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-glass px-2 py-0.5 ring-1 ring-border">
                <Loader2 className="h-3 w-3 animate-spin" /> carregando
              </span>
            )}
            {heroPreviewStatus === "ok" && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary ring-1 ring-primary/40">ok</span>
            )}
            {heroPreviewStatus === "invalid" && (
              <span className="rounded-full bg-warn/15 px-2 py-0.5 text-warn ring-1 ring-warn/40">URL inválida</span>
            )}
            {heroPreviewStatus === "error" && (
              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-destructive ring-1 ring-destructive/40">falha ao carregar</span>
            )}
          </div>

          {/* Toggle Desktop / Mobile */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="inline-flex rounded-lg bg-muted p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setHeroPreviewDevice("desktop")}
                aria-pressed={heroPreviewDevice === "desktop"}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${heroPreviewDevice === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Monitor className="h-3.5 w-3.5" /> Desktop
              </button>
              <button
                type="button"
                onClick={() => setHeroPreviewDevice("mobile")}
                aria-pressed={heroPreviewDevice === "mobile"}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${heroPreviewDevice === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Smartphone className="h-3.5 w-3.5" /> Mobile
              </button>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {heroPreviewDevice === "desktop"
                ? `Altura ${heroHeightDesktop}px · modo ${heroFit}`
                : `Altura ${heroHeightMobile}px · modo ${heroFit}`}
            </div>
          </div>

          {/* Frame — mesma altura/fit da home; sem cortar em telas estreitas */}
          <div className="overflow-x-auto rounded-2xl bg-glass/40 p-3 ring-1 ring-border">
            <div
              className={`relative mx-auto overflow-hidden rounded-xl bg-glass ring-1 ring-border ${heroPreviewDevice === "mobile" ? "w-[390px] max-w-full" : "w-full min-w-[640px]"}`}
              style={{
                height: heroPreviewDevice === "desktop" ? heroHeightDesktop : heroHeightMobile,
              }}
            >
              {heroImageUrl && heroPreviewStatus === "ok" ? (
                <img
                  src={heroImageUrl}
                  alt={`Prévia ${heroPreviewDevice}`}
                  className="block h-full w-full"
                  style={{ objectFit: heroFit, objectPosition: "center" }}
                />
              ) : heroPreviewStatus === "loading" ? (
                <div className="grid h-full place-items-center text-xs text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                <HeroPlaceholder
                  tone={heroPreviewStatus === "error" ? "error" : heroPreviewStatus === "invalid" ? "warn" : "empty"}
                />
              )}
            </div>
          </div>
        </div>

      </section>


      {/* CITAÇÕES WEB — Kill switch + limite diário + custo */}
      <section className="glass-panel mx-auto mt-6 max-w-7xl rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-warn/15 ring-1 ring-warn/40">
              <Shield className="h-4 w-4 text-warn" />
            </div>
            <div>
              <h2 className="text-lg font-bold inline-flex items-center gap-1.5">
                Busca de citações web (IA)
                <HelpTip
                  title="Kill switch de citações web"
                  text="Desligado por padrão de propósito, para você validar o custo real antes de liberar para os usuários. Master e admin conseguem testar mesmo com ele desligado."
                />
              </h2>
              <p className="max-w-xl text-xs text-muted-foreground">
                Kill switch global. Nasce <strong>desligado</strong>. Ative apenas depois de validar o custo real
                por busca com dados abaixo. Admin e master ignoram o interruptor para testes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleCitations(!citationsEnabled)}
            disabled={settingsBusy}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider ring-1 transition ${
              citationsEnabled
                ? "bg-primary/15 text-primary ring-primary/40"
                : "bg-muted text-muted-foreground ring-border"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${citationsEnabled ? "bg-primary" : "bg-muted-foreground"}`} />
            {citationsEnabled ? "Ativado para Pro" : "Desligado"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[220px_1fr]">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground inline-flex items-center gap-1">
              Limite diário por usuário
              <HelpTip
                title="Limite diário por usuário"
                text="Quantidade máxima de buscas de citação que cada usuário pode fazer por dia — protege contra custo alto se muita gente usar ao mesmo tempo."
              />
            </span>
            <input
              type="number"
              min={0}
              max={1000}
              value={citationsLimit}
              onChange={(e) => setCitationsLimit(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
              onBlur={() =>
                writeSettings({ data: { citations_daily_limit: citationsLimit } }).catch(() => {})
              }
              className="mt-1 w-full rounded-xl bg-glass px-4 py-2.5 text-sm tabular-nums outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/70"
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <CostTile label="Hoje" calls={costStats?.today_calls} cents={costStats?.today_cost_cents} />
            <CostTile label="7 dias" calls={costStats?.last7_calls} cents={costStats?.last7_cost_cents} />
            <CostTile label="30 dias" calls={costStats?.last30_calls} cents={costStats?.last30_cost_cents} sub={costStats ? `${costStats.distinct_users_30d} usuários` : undefined} />
          </div>
        </div>
      </section>





      <div className="glass-panel mx-auto mt-6 max-w-7xl overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.02] text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Buscas/mês</th>
              <th className="px-4 py-3">Último login</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === user?.id;
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{u.full_name || u.email.split("@")[0]}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                    {u.roles.includes("master") && (
                      <span className="mt-1 inline-block rounded-full bg-warn/20 px-2 py-0.5 text-[10px] font-bold text-warn">MASTER</span>
                    )}
                    {u.roles.includes("admin") && !u.roles.includes("master") && (
                      <span className="mt-1 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">ADMIN</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PlanCell u={u} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${u.status === "active" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
                      {u.status === "active" ? "Ativo" : "Bloqueado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{u.search_count_month}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1.5">
                      <GrantMenu u={u} busy={busy === u.id} onGrant={(p) => grant(u, p)} />
                      <button
                        onClick={() => toggleStatus(u)}
                        disabled={busy === u.id || isSelf}
                        title={isSelf ? "Não é possível bloquear a si mesmo" : ""}
                        className="flex items-center gap-1 rounded-full bg-glass px-3 py-1 text-xs font-semibold ring-1 ring-border hover:bg-white/5 disabled:opacity-40"
                      >
                        {u.status === "active" ? <><Ban className="h-3 w-3" /> Bloquear</> : <><Check className="h-3 w-3" /> Ativar</>}
                      </button>
                      <button
                        onClick={() => resetPassword(u)}
                        disabled={busy === u.id}
                        className="flex items-center gap-1 rounded-full bg-glass px-3 py-1 text-xs font-semibold ring-1 ring-border hover:bg-white/5 disabled:opacity-50"
                      >
                        <KeyRound className="h-3 w-3" /> Reset senha
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Nenhum usuário cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AiKeysPanel />

      <p className="mx-auto mt-4 max-w-7xl text-xs text-muted-foreground">
        Rota oculta. Acesso restrito a papéis <code>master</code> e <code>admin</code>. Todas as ações são registradas em <code>admin_audit_log</code>.
      </p>
    </div>
  );
}

function CostTile({ label, calls, cents, sub }: { label: string; calls?: number; cents?: number; sub?: string }) {
  const brl = cents == null ? "—" : `R$ ${(cents / 100).toFixed(2)}`;
  return (
    <div className="rounded-xl bg-glass p-3 ring-1 ring-border">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-extrabold tabular-nums text-foreground">{calls ?? 0}</div>
      <div className="text-[11px] tabular-nums text-primary">{brl}</div>
      {sub && <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ============================================================================
// v5.4.3 Part G — Multi-provider AI key registry (failover cadastro)
// ============================================================================
import {
  listAiProviderKeys,
  upsertAiProviderKey,
  deleteAiProviderKey,
  testAiProviderKey,
  testAllAiProviderKeys,
  saveAndTestProvider,
  getAiSelection,
  setAiSelection,
  PROVIDERS,
  PROVIDER_LABEL,
  PROVIDER_MODELS,
  type AiProviderKey,
  type AiSelection,
  type WizardResult,
} from "@/lib/ai-keys.functions";

import { Plus, Trash2, PlayCircle, KeySquare, Zap, CheckCircle2, Eye, EyeOff, Wand2, AlertTriangle } from "lucide-react";


const STATUS_STYLES: Record<AiProviderKey["status"], string> = {
  active:       "bg-emerald-500/15 text-emerald-300 ring-emerald-400/40",
  untested:     "bg-white/5 text-muted-foreground ring-border",
  rate_limited: "bg-amber-500/15 text-amber-200 ring-amber-400/40",
  error:        "bg-red-500/15 text-red-300 ring-red-400/40",
  disabled:     "bg-white/5 text-muted-foreground/60 ring-border",
};
const STATUS_LABEL: Record<AiProviderKey["status"], string> = {
  active: "Ativa",
  untested: "Não testada",
  rate_limited: "Limite atingido",
  error: "Com erro",
  disabled: "Desativada",
};
const STATUS_DOT: Record<AiProviderKey["status"], string> = {
  active: "bg-emerald-400",
  untested: "bg-muted-foreground/40",
  rate_limited: "bg-amber-400",
  error: "bg-red-400",
  disabled: "bg-muted-foreground/30",
};

function AiKeysPanel() {
  const list = useServerFn(listAiProviderKeys);
  const upsert = useServerFn(upsertAiProviderKey);
  const del = useServerFn(deleteAiProviderKey);
  const test = useServerFn(testAiProviderKey);
  const testAll = useServerFn(testAllAiProviderKeys);
  const wizard = useServerFn(saveAndTestProvider);

  const getSel = useServerFn(getAiSelection);
  const setSel = useServerFn(setAiSelection);
  const [rows, setRows] = useState<AiProviderKey[]>([]);
  const [selection, setSelection] = useState<AiSelection>({ mode: "auto", manual_key_id: null });
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ provider: "openai" as AiProviderKey["provider"], label: "", secret_name: "", model: PROVIDER_MODELS.openai.default, priority: 100 });
  const [loading, setLoading] = useState(true);

  // Assistente ("poucos cliques")
  const [wiz, setWiz] = useState({
    provider: "nvidia" as AiProviderKey["provider"],
    api_key: "",
    model: PROVIDER_MODELS.nvidia?.default ?? "",
    show: false,
  });
  const [wizResult, setWizResult] = useState<WizardResult | null>(null);
  const [wizBusy, setWizBusy] = useState(false);
  const [wizErr, setWizErr] = useState<string | null>(null);

  async function runWizard(e: React.FormEvent) {
    e.preventDefault();
    setWizErr(null);
    setWizResult(null);
    const key = wiz.api_key.trim();
    if (key.length < 4) { setWizErr("Cole a chave da API antes de salvar."); return; }
    setWizBusy(true);
    try {
      const res = await wizard({ data: {
        provider: wiz.provider,
        api_key: key,
        model: wiz.model?.trim() || null,
      }});
      setWizResult(res);
      setWiz({ ...wiz, api_key: "" });
      await reload();
    } catch (e: any) {
      setWizErr(String(e?.message ?? e));
    } finally {
      setWizBusy(false);
    }
  }


  async function reload() {
    setErr(null);
    try {
      const [r, s] = await Promise.all([list(), getSel()]);
      setRows(r);
      setSelection(s);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label || !form.secret_name) return;
    setBusy("new");
    try {
      await upsert({ data: { ...form, model: form.model?.trim() || null } });
      setForm({ ...form, label: "", secret_name: "" });
      await reload();
    }
    catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(null); }
  }


  async function changeMode(mode: "auto" | "manual", manualId?: string | null) {
    setBusy("mode");
    try {
      const next = await setSel({ data: { mode, manual_key_id: manualId ?? selection.manual_key_id ?? null } });
      setSelection(next);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(null); }
  }

  const activeCount = rows.filter((r) => r.status === "active").length;

  return (
    <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
      <div className="glass-panel rounded-2xl p-4 sm:p-6">
        <header className="mb-4 flex flex-wrap items-center gap-2">
          <KeySquare className="h-5 w-5 text-primary" />
          <h2 className="text-base font-extrabold text-foreground inline-flex items-center gap-1.5">
            Chaves de IA com failover
            <HelpTip
              title="Failover de IA"
              text="O app tenta as chaves em ordem de prioridade. Se uma falha ou está fora, cai automaticamente na próxima — assim o chat de suporte e a busca de citações não param."
            />
          </h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary ring-1 ring-primary/30">
            v5.5 · multi-provedor
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300 ring-1 ring-emerald-400/30">
            <span className={`h-1.5 w-1.5 rounded-full ${activeCount > 0 ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
            {activeCount} ativa{activeCount === 1 ? "" : "s"}
          </span>
        </header>
        <p className="mb-4 text-xs text-muted-foreground">
          Cadastre múltiplas chaves por provedor. Provedores suportados: {Object.values(PROVIDER_LABEL).join(", ")}.
          Os valores das chaves ficam no cofre de secrets — aqui só ficam o nome do secret, prioridade e status.
        </p>

        {/* Selection mode */}
        <div className="mb-4 grid gap-3 rounded-xl bg-glass p-3 ring-1 ring-border sm:grid-cols-2">
          <button
            type="button"
            onClick={() => changeMode("auto")}
            className={`flex items-start gap-2 rounded-lg p-3 text-left ring-1 transition ${
              selection.mode === "auto"
                ? "bg-primary/10 ring-primary/40"
                : "bg-background/40 ring-border hover:bg-white/5"
            }`}
          >
            <Zap className={`mt-0.5 h-4 w-4 ${selection.mode === "auto" ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <div className="text-sm font-bold">Automático (melhor disponível)</div>
              <div className="text-[11px] text-muted-foreground">
                Usa a chave ativa de menor prioridade. Se falhar (erro/limite), promove a próxima.
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => changeMode("manual", selection.manual_key_id ?? rows[0]?.id ?? null)}
            className={`flex items-start gap-2 rounded-lg p-3 text-left ring-1 transition ${
              selection.mode === "manual"
                ? "bg-primary/10 ring-primary/40"
                : "bg-background/40 ring-border hover:bg-white/5"
            }`}
          >
            <CheckCircle2 className={`mt-0.5 h-4 w-4 ${selection.mode === "manual" ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <div className="text-sm font-bold">Manual (chave fixa)</div>
              <div className="text-[11px] text-muted-foreground">
                Sempre usa a chave marcada abaixo. Nada de failover automático.
              </div>
            </div>
          </button>
        </div>

        {/* ============== ASSISTENTE (poucos cliques) ============== */}
        <form onSubmit={runWizard} className="mb-4 rounded-xl bg-primary/5 p-4 ring-1 ring-primary/30">
          <div className="mb-3 flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-extrabold">Assistente de configuração</h3>
            <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">3 passos · ~30s</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-[180px_1fr_1fr_auto]">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">1 · Provedor</label>
              <select
                value={wiz.provider}
                onChange={(e) => {
                  const next = e.target.value as AiProviderKey["provider"];
                  setWiz({ ...wiz, provider: next, model: PROVIDER_MODELS[next]?.default ?? "" });
                }}
                className="w-full rounded-md bg-background px-2 py-2 text-sm ring-1 ring-border [color-scheme:dark]"
              >
                {PROVIDERS.map((p) => (
                  <option key={p} className="bg-background text-foreground" value={p}>{PROVIDER_LABEL[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">2 · Chave da API</label>
              <div className="flex items-center gap-1">
                <input
                  type={wiz.show ? "text" : "password"}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Cole aqui a API key (ex: nvapi-... / sk-...)"
                  value={wiz.api_key}
                  onChange={(e) => setWiz({ ...wiz, api_key: e.target.value })}
                  className="w-full rounded-md bg-background px-2 py-2 text-sm font-mono ring-1 ring-border"
                />
                <button
                  type="button"
                  onClick={() => setWiz({ ...wiz, show: !wiz.show })}
                  className="rounded-md bg-glass p-2 ring-1 ring-border hover:bg-white/5"
                  title={wiz.show ? "Ocultar" : "Mostrar"}
                >
                  {wiz.show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-muted-foreground">3 · Modelo</label>
              <input
                list={`wiz-models-${wiz.provider}`}
                placeholder={PROVIDER_MODELS[wiz.provider]?.default ?? "modelo do provedor"}
                value={wiz.model}
                onChange={(e) => setWiz({ ...wiz, model: e.target.value })}
                className="w-full rounded-md bg-background px-2 py-2 text-xs font-mono ring-1 ring-border"
              />
              <datalist id={`wiz-models-${wiz.provider}`}>
                {(PROVIDER_MODELS[wiz.provider]?.options ?? []).map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
            <div className="flex items-end">
              <button
                disabled={wizBusy}
                className="inline-flex h-[38px] items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-extrabold text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-110 disabled:opacity-50"
              >
                <PlayCircle className="h-4 w-4" />
                {wizBusy ? "Testando…" : "Salvar e testar"}
              </button>
            </div>
          </div>

          {wizErr && (
            <div className="mt-3 flex items-start gap-2 rounded-md bg-red-500/10 p-2 text-xs text-red-300 ring-1 ring-red-500/40">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="break-words">{wizErr}</span>
            </div>
          )}

          {wizResult && (
            <div
              className={`mt-3 rounded-md p-3 text-xs ring-1 ${
                wizResult.status === "active"
                  ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/40"
                  : wizResult.status === "rate_limited"
                  ? "bg-amber-500/10 text-amber-200 ring-amber-500/40"
                  : "bg-red-500/10 text-red-200 ring-red-500/40"
              }`}
            >
              <div className="mb-1 flex items-center gap-2 text-sm font-bold">
                {wizResult.status === "active" ? (
                  <><CheckCircle2 className="h-4 w-4" /> Conexão OK</>
                ) : wizResult.status === "rate_limited" ? (
                  <><AlertTriangle className="h-4 w-4" /> Chave válida, mas com limite atingido</>
                ) : (
                  <><AlertTriangle className="h-4 w-4" /> Falhou — veja o motivo abaixo</>
                )}
              </div>
              <div className="grid gap-0.5 text-[11px] font-mono opacity-90">
                <span>Provedor: <b>{PROVIDER_LABEL[wizResult.provider]}</b></span>
                <span>Modelo: <b>{wizResult.model ?? "(padrão)"}</b></span>
                <span className="break-all">Mensagem: {wizResult.message}</span>
                <span>Testado em: {new Date(wizResult.tested_at).toLocaleString("pt-BR")}</span>
              </div>
            </div>
          )}
        </form>

        {/* ============== FORM AVANÇADO (rótulo + secret + prioridade) ============== */}
        <details className="mb-4 rounded-xl bg-glass p-3 ring-1 ring-border">
          <summary className="cursor-pointer text-xs font-bold text-muted-foreground">
            Cadastro avançado (usar secret do ambiente, rótulo e prioridade)
          </summary>
        <form onSubmit={add} className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr_1fr_1fr_90px_auto]">

          <select
            value={form.provider}
            onChange={(e) => {
              const next = e.target.value as AiProviderKey["provider"];
              setForm({ ...form, provider: next, model: PROVIDER_MODELS[next]?.default ?? "" });
            }}
            className="rounded-md bg-background px-2 py-1.5 text-sm ring-1 ring-border [color-scheme:dark]"
          >
            {PROVIDERS.map((p) => (
              <option key={p} className="bg-background text-foreground" value={p}>{PROVIDER_LABEL[p]}</option>
            ))}
          </select>
          <input
            placeholder="Rótulo (ex: OpenAI principal)"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="rounded-md bg-background px-2 py-1.5 text-sm ring-1 ring-border"
          />
          <input
            placeholder="Nome do secret (ex: NVIDIA_API_KEY)"
            value={form.secret_name}
            onChange={(e) => setForm({ ...form, secret_name: e.target.value.toUpperCase() })}
            className="rounded-md bg-background px-2 py-1.5 text-sm font-mono ring-1 ring-border"
          />
          <div className="flex items-center gap-1">
            <input
              list={`models-${form.provider}`}
              placeholder="Modelo (ex: nvidia/llama-3.1-nemotron-70b-instruct)"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              className="w-full rounded-md bg-background px-2 py-1.5 text-xs font-mono ring-1 ring-border"
            />
            <datalist id={`models-${form.provider}`}>
              {(PROVIDER_MODELS[form.provider]?.options ?? []).map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <HelpTip
              title="Modelo do provedor"
              text="Escolha um modelo compatível com o provedor (ex.: Nemotron-70b, Llama-Nemotron para NVIDIA). O teste passa a chamar esse modelo específico e o erro mostra exatamente o que falhou (autenticação, modelo indisponível, limite ou rede). Deixe em branco para usar o padrão do provedor."
            />
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={999}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              title="Prioridade de failover — menor número é tentado primeiro (padrão: 100)"
              placeholder="Prioridade"
              className="w-full rounded-md bg-background px-2 py-1.5 text-sm tabular-nums ring-1 ring-border"
            />
            <HelpTip
              title="Prioridade de failover"
              text="Menor número é tentado primeiro. Use 10 para a chave principal, 20/30 para reservas. Se todas empatarem em 100, a ordem fica aleatória."
            />
          </div>
          <button
            disabled={busy === "new"}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Cadastrar
          </button>
        </form>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            Depois de cadastrar, salve o valor da chave em <b>Configurações → Secrets</b> com o mesmo nome. O status é atualizado ao clicar em <b>Testar</b>.
          </p>
          <button
            type="button"
            onClick={async () => { setBusy("all"); try { await testAll(); await reload(); } finally { setBusy(null); } }}
            disabled={busy === "all" || rows.length === 0}
            className="inline-flex items-center gap-1 rounded-full bg-glass px-3 py-1 text-[11px] font-bold ring-1 ring-border hover:bg-white/5 disabled:opacity-50"
          >
            {busy === "all" ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />}
            Testar todas
          </button>
        </div>

        {err && <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{err}</div>}

        <div className="overflow-x-auto rounded-xl ring-1 ring-border">
          <table className="w-full text-xs">
            <thead className="bg-glass text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-center">Usar</th>
                <th className="px-3 py-2 text-left">Provedor</th>
                <th className="px-3 py-2 text-left">Rótulo</th>
                <th className="px-3 py-2 text-left">Secret</th>
                <th className="px-3 py-2 text-center">Prioridade</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Último teste</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">Carregando…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  Nenhuma chave cadastrada. Adicione ao menos <b>duas</b> para ativar o failover.
                </td></tr>
              )}
              {rows.map((r) => {
                const isManualPick = selection.mode === "manual" && selection.manual_key_id === r.id;
                return (
                <tr key={r.id} className={`border-t border-border ${isManualPick ? "bg-primary/5" : ""}`}>
                  <td className="px-2 py-2 text-center">
                    <input
                      type="radio"
                      name="ai-manual"
                      checked={isManualPick}
                      disabled={selection.mode !== "manual" || busy === "mode"}
                      onChange={() => changeMode("manual", r.id)}
                      aria-label={`Usar ${r.label}`}
                      className="h-3.5 w-3.5 accent-[oklch(var(--primary))]"
                    />
                  </td>
                  <td className="px-3 py-2 font-bold uppercase text-primary">{PROVIDER_LABEL[r.provider] ?? r.provider}</td>
                  <td className="px-3 py-2">
                    <div>{r.label}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/80" title="Modelo usado no teste e no failover">
                      {r.model ?? <span className="italic">padrão do provedor</span>}
                    </div>
                  </td>

                  <td className="px-3 py-2 font-mono text-[11px]">
                    {r.secret_name}{" "}
                    {!r.secret_present && (
                      <span className="ml-1 rounded bg-red-500/15 px-1 py-0.5 text-[9px] font-bold text-red-300 ring-1 ring-red-400/40">
                        secret vazio
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">{r.priority}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${STATUS_STYLES[r.status]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[r.status]} ${r.status === "active" ? "animate-pulse" : ""}`} />
                      {STATUS_LABEL[r.status]}
                    </span>
                    {r.last_error && (
                      <div className="mt-0.5 max-w-[220px] truncate text-[10px] text-red-300/80" title={r.last_error}>{r.last_error}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">
                    {r.last_tested_at ? new Date(r.last_tested_at).toLocaleString("pt-BR") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={async () => { setBusy(r.id); try { await test({ data: { id: r.id } }); await reload(); } finally { setBusy(null); } }}
                        disabled={busy === r.id}
                        className="inline-flex items-center gap-1 rounded-full bg-glass px-2.5 py-1 text-[11px] font-semibold ring-1 ring-border hover:bg-white/5 disabled:opacity-50"
                      >
                        {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />} Testar
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Remover a chave “${r.label}”?`)) return;
                          setBusy(r.id);
                          try { await del({ data: { id: r.id } }); await reload(); }
                          finally { setBusy(null); }
                        }}
                        disabled={busy === r.id}
                        className="inline-flex items-center gap-1 rounded-full bg-glass px-2.5 py-1 text-[11px] font-semibold text-red-300 ring-1 ring-red-400/30 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" /> Remover
                      </button>
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </div>
    </section>

  );
}

type GrantPayload =
  | { userId: string; mode: "free"; reason?: string }
  | { userId: string; mode: "date"; valid_until: string; reason?: string }
  | { userId: string; mode: "searches"; searches_granted: number; reason?: string };

function PlanCell({ u }: { u: AdminUserRow }) {
  const mode = (u as unknown as { pro_access_mode?: "none" | "date" | "searches" }).pro_access_mode ?? "none";
  const until = (u as unknown as { pro_valid_until?: string | null }).pro_valid_until ?? null;
  const remaining = (u as unknown as { pro_searches_remaining?: number | null }).pro_searches_remaining ?? null;
  const isPro = u.plan === "pro";
  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-block w-fit rounded-full px-2 py-0.5 text-xs font-bold ${isPro ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
        {u.plan.toUpperCase()}
      </span>
      {isPro && mode === "date" && until && (
        <span className="text-[10px] text-muted-foreground">até {new Date(until).toLocaleDateString("pt-BR")}</span>
      )}
      {isPro && mode === "searches" && remaining != null && (
        <span className="text-[10px] text-muted-foreground">{remaining} buscas restantes</span>
      )}
    </div>
  );
}

function GrantMenu({ u, busy, onGrant }: { u: AdminUserRow; busy: boolean; onGrant: (p: GrantPayload) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"date" | "searches">("date");
  const defaultDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [validUntil, setValidUntil] = useState(defaultDate);
  const [searches, setSearches] = useState(100);
  const isPro = u.plan === "pro";

  if (!open) {
    return (
      <div className="inline-flex gap-1.5">
        <button
          onClick={() => setOpen(true)}
          disabled={busy}
          className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/40 hover:bg-primary/25 disabled:opacity-50"
        >
          {isPro ? "Ajustar Pro" : "Conceder Pro"}
        </button>
        {isPro && (
          <button
            onClick={() => onGrant({ userId: u.id, mode: "free" })}
            disabled={busy}
            className="rounded-full bg-glass px-3 py-1 text-xs font-semibold ring-1 ring-border hover:bg-white/5 disabled:opacity-50"
          >
            Voltar Free
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="glass-panel flex flex-wrap items-center gap-1.5 rounded-xl p-2 text-xs">
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as "date" | "searches")}
        className="rounded bg-glass px-2 py-1 ring-1 ring-border [color-scheme:dark]"
      >
        <option className="bg-background text-foreground" value="date">Por data</option>
        <option className="bg-background text-foreground" value="searches">Por buscas</option>
      </select>
      {mode === "date" ? (
        <input
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
          className="rounded bg-glass px-2 py-1 ring-1 ring-border"
        />
      ) : (
        <input
          type="number"
          min={1}
          value={searches}
          onChange={(e) => setSearches(Number(e.target.value))}
          className="w-20 rounded bg-glass px-2 py-1 ring-1 ring-border"
        />
      )}
      <button
        onClick={() => {
          onGrant(
            mode === "date"
              ? { userId: u.id, mode: "date", valid_until: new Date(validUntil).toISOString() }
              : { userId: u.id, mode: "searches", searches_granted: searches },
          );
          setOpen(false);
        }}
        disabled={busy}
        className="rounded-full bg-primary px-3 py-1 font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
      >
        Aplicar
      </button>
      <button
        onClick={() => setOpen(false)}
        className="rounded-full bg-glass px-3 py-1 ring-1 ring-border hover:bg-white/5"
      >
        Cancelar
      </button>
    </div>
  );
}

