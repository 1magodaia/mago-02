export interface SportCategory {
  id: string;
  emoji: string;
  label: string;
  keywords: string[];
}

export const SPORT_CATEGORIES: SportCategory[] = [
  { id: "futebol", emoji: "⚽", label: "Escolinhas de futebol", keywords: ["escolinha de futebol", "escola de futebol infantil"] },
  { id: "basquete", emoji: "🏀", label: "Quadras de basquete", keywords: ["quadra de basquete", "basketball court"] },
  { id: "tenis", emoji: "🎾", label: "Quadras de tênis", keywords: ["quadra de tênis", "tennis court"] },
  { id: "golfe", emoji: "⛳", label: "Campos de golfe", keywords: ["campo de golfe", "clube de golfe"] },
  { id: "academia", emoji: "🏋️", label: "Academias de musculação", keywords: ["academia de musculação", "academia fitness"] },
  { id: "natacao", emoji: "🏊", label: "Piscinas e natação", keywords: ["academia de natação", "escola de natação"] },
  { id: "yoga", emoji: "🧘", label: "Yoga e pilates", keywords: ["estúdio de yoga", "estúdio de pilates"] },
  { id: "skate", emoji: "🛹", label: "Skateparks", keywords: ["pista de skate", "skatepark"] },
  { id: "lutas", emoji: "🥋", label: "Artes marciais", keywords: ["academia de jiu-jitsu", "muay thai", "karate", "taekwondo"] },
  { id: "clube", emoji: "🏌️", label: "Clubes esportivos", keywords: ["clube esportivo"] },
  { id: "patinacao", emoji: "⛸️", label: "Pistas de patinação", keywords: ["pista de patinação", "ice skating"] },
  { id: "sinuca", emoji: "🎱", label: "Sinucas / bilhar", keywords: ["sinuca", "bilhar"] },
  { id: "volei", emoji: "🏐", label: "Quadras de vôlei", keywords: ["quadra de vôlei", "volleyball court"] },
  { id: "roller", emoji: "🛼", label: "Rollerskating", keywords: ["rollerskate", "patinação em linha"] },
];

export const SPORT_BY_ID: Record<string, SportCategory> = Object.fromEntries(
  SPORT_CATEGORIES.map((s) => [s.id, s]),
);
