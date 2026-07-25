import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/avaliacao")({
  component: AvaliacaoPage,
  head: () => ({
    meta: [
      { title: "Avaliação do App — Busca Mágica" },
      {
        name: "description",
        content:
          "Cadastre áreas, funcionalidades, eventos e pontos de toque do app e atribua notas de 0 a 10.",
      },
      { property: "og:title", content: "Avaliação do App — Busca Mágica" },
      {
        property: "og:description",
        content:
          "Ferramenta interna para pontuar áreas, funcionalidades, eventos e pontos de toque.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type ItemType = "area" | "funcionalidade" | "evento" | "ponto_toque";

type Item = {
  id: string;
  type: ItemType;
  name: string;
  score: number;
  note?: string;
  createdAt: number;
};

const TYPE_LABEL: Record<ItemType, string> = {
  area: "Área",
  funcionalidade: "Funcionalidade",
  evento: "Evento",
  ponto_toque: "Ponto de toque",
};

const STORAGE_KEY = "bm.avaliacao.items.v1";

function scoreColor(score: number) {
  if (score >= 8) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (score >= 5) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return "bg-rose-500/15 text-rose-400 border-rose-500/30";
}

function AvaliacaoPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [type, setType] = useState<ItemType>("area");
  const [name, setName] = useState("");
  const [score, setScore] = useState<number>(7);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<ItemType | "todos">("todos");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const filtered = useMemo(
    () => (filter === "todos" ? items : items.filter((i) => i.type === filter)),
    [items, filter]
  );

  const summary = useMemo(() => {
    const byType: Record<ItemType, { count: number; avg: number }> = {
      area: { count: 0, avg: 0 },
      funcionalidade: { count: 0, avg: 0 },
      evento: { count: 0, avg: 0 },
      ponto_toque: { count: 0, avg: 0 },
    };
    const totals: Record<ItemType, number> = {
      area: 0,
      funcionalidade: 0,
      evento: 0,
      ponto_toque: 0,
    };
    for (const it of items) {
      byType[it.type].count += 1;
      totals[it.type] += it.score;
    }
    (Object.keys(byType) as ItemType[]).forEach((k) => {
      byType[k].avg = byType[k].count ? totals[k] / byType[k].count : 0;
    });
    const overall =
      items.length > 0
        ? items.reduce((s, i) => s + i.score, 0) / items.length
        : 0;
    return { byType, overall, total: items.length };
  }, [items]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const clamped = Math.max(0, Math.min(10, Number(score) || 0));
    setItems((prev) => [
      {
        id: crypto.randomUUID(),
        type,
        name: name.trim(),
        score: clamped,
        note: note.trim() || undefined,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    setName("");
    setNote("");
    setScore(7);
  }

  function handleRemove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function handleClear() {
    if (confirm("Limpar todas as avaliações?")) setItems([]);
  }

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Avaliação do App
          </h1>
          <p className="text-muted-foreground">
            Cadastre áreas, funcionalidades, eventos e pontos de toque. Dê uma
            nota de 0 a 10 para cada um.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Novo item</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleAdd}
              className="grid gap-4 md:grid-cols-[160px_1fr_120px_auto]"
            >
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as ItemType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="area">Área</SelectItem>
                    <SelectItem value="funcionalidade">
                      Funcionalidade
                    </SelectItem>
                    <SelectItem value="evento">Evento</SelectItem>
                    <SelectItem value="ponto_toque">Ponto de toque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Ex: Busca por localização"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="score">Nota (0–10)</Label>
                <Input
                  id="score"
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                />
              </div>

              <div className="flex md:items-end">
                <Button type="submit" className="w-full md:w-auto">
                  Adicionar
                </Button>
              </div>

              <div className="space-y-1.5 md:col-span-4">
                <Label htmlFor="note">Observação (opcional)</Label>
                <Input
                  id="note"
                  placeholder="O que motivou a nota?"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Resumo</CardTitle>
            <Badge variant="outline" className={scoreColor(summary.overall)}>
              Média geral: {summary.overall.toFixed(1)} · {summary.total} itens
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(Object.keys(TYPE_LABEL) as ItemType[]).map((t) => {
                const s = summary.byType[t];
                return (
                  <div
                    key={t}
                    className="rounded-lg border border-border/60 p-3 bg-card/40"
                  >
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {TYPE_LABEL[t]}
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-2xl font-semibold">
                        {s.avg.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {s.count} {s.count === 1 ? "item" : "itens"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle>Lista</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={filter}
                onValueChange={(v) => setFilter(v as ItemType | "todos")}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="area">Áreas</SelectItem>
                  <SelectItem value="funcionalidade">
                    Funcionalidades
                  </SelectItem>
                  <SelectItem value="evento">Eventos</SelectItem>
                  <SelectItem value="ponto_toque">Pontos de toque</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={!items.length}
              >
                Limpar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhum item cadastrado ainda.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {filtered.map((i) => (
                  <li
                    key={i.id}
                    className="py-3 flex items-start gap-3"
                  >
                    <Badge
                      variant="outline"
                      className={`min-w-11 justify-center ${scoreColor(i.score)}`}
                    >
                      {i.score}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{i.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {TYPE_LABEL[i.type]}
                        </Badge>
                      </div>
                      {i.note && (
                        <p className="text-sm text-muted-foreground mt-0.5 break-words">
                          {i.note}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(i.id)}
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
