import { createFileRoute } from "@tanstack/react-router";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Você é o assistente do Busca Mágica, uma plataforma brasileira de prospecção de leads locais por geolocalização (Google Maps + auditoria de presença digital).

RECURSOS DA PLATAFORMA:
- Busca por categoria + região OU GPS real, com raio ajustável (1–25 km).
- Auditoria automática: detecta site, Instagram, Facebook, WhatsApp.
- Score em 3 cores: 🟢 verde (sem site e sem redes = quente), 🟡 amarelo (parcial), 🟠 laranja (presença completa).
- Bônus quente: última avaliação Google > 180 dias.
- Exportação CSV com 15 colunas (nome, endereço, telefone, WhatsApp, site, maps, IG, FB, rating, avaliações, última avaliação, categoria, status digital, score 1-10, data coleta).
- Botão WhatsApp em cada lead abre conversa com mensagem pré-pronta.
- Categorias esportivas: escolinhas, quadras, academias, piscinas, yoga/pilates, skate, artes marciais, clubes, patinação, sinuca, vôlei, rollerskating.
- Plano Free: buscas limitadas por mês. Plano Pro: buscas ilimitadas + CSV + citações web.
- Identidade: roxo (#6B46E0) + dourado (#EF9F27), logo mago.

COMO RESPONDER:
- Sempre em português brasileiro.
- Curto, direto e prático (máx. 2-3 parágrafos).
- Nunca invente funcionalidade que não existe. Se não souber, diga "vou checar com o time".
- Amigável, encorajador, com emojis pontuais.`;

export const Route = createFileRoute("/api/chat/support")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return Response.json({ success: false, error: "AI indisponível" }, { status: 500 });
        }
        let body: { message?: string; history?: ChatMsg[] };
        try {
          body = (await request.json()) as { message?: string; history?: ChatMsg[] };
        } catch {
          return Response.json({ success: false, error: "Payload inválido" }, { status: 400 });
        }
        const message = (body.message ?? "").trim();
        if (!message) {
          return Response.json({ success: false, error: "Mensagem vazia" }, { status: 400 });
        }
        const history = Array.isArray(body.history) ? body.history.slice(-10) : [];

        const messages = [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content ?? "").slice(0, 4000),
          })),
          { role: "user", content: message.slice(0, 4000) },
        ];

        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 15000);
        try {
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": key,
            },
            body: JSON.stringify({
              model: "google/gemini-3.6-flash",
              messages,
              temperature: 0.6,
              max_tokens: 600,
            }),
            signal: ac.signal,
          });
          clearTimeout(timer);
          if (res.status === 429) {
            return Response.json(
              { success: false, error: "Muitas perguntas seguidas. Aguarde um minuto." },
              { status: 429 },
            );
          }
          if (res.status === 402) {
            return Response.json(
              { success: false, error: "Créditos de IA esgotados. Fale com o suporte." },
              { status: 402 },
            );
          }
          if (!res.ok) {
            const t = await res.text().catch(() => "");
            console.error("[chat/support]", res.status, t);
            return Response.json(
              { success: false, error: "Ops! Algo deu errado. Tente novamente em alguns segundos." },
              { status: 500 },
            );
          }
          const json = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const reply =
            json.choices?.[0]?.message?.content?.trim() ||
            "Não consegui gerar uma resposta agora. Tente reformular a pergunta.";
          return Response.json({
            success: true,
            response: reply,
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          clearTimeout(timer);
          const aborted = err instanceof Error && err.name === "AbortError";
          return Response.json(
            {
              success: false,
              error: aborted
                ? "Levando um tempo... Seja paciente :)"
                : "Houve um erro. Tente novamente em alguns segundos.",
            },
            { status: aborted ? 504 : 500 },
          );
        }
      },
    },
  },
});
