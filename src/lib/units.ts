export const unitLabels: Record<string, string> = {
  UN: "Unidade",
  CX: "Caixa",
  PC: "Peça",
  JG: "Jogo",
  KIT: "Kit",
  PAR: "Par",
  KG: "Quilograma",
  G: "Grama",
  T: "Tonelada",
  TON: "Tonelada",
  M: "Metro",
  CM: "Centímetro",
  MM: "Milímetro",
  M2: "Metro quadrado",
  M3: "Metro cúbico",
  L: "Litro",
  ML: "Mililitro",
  SC: "Saco",
  FD: "Fardo",
  RL: "Rolo",
  GL: "Galão",
  HR: "Hora",
  DIA: "Dia",
  MES: "Mês",
};

export function formatUnit(unit: string) {
  const normalized = unit.trim().toUpperCase();
  return `${normalized} (${unitLabels[normalized] ?? "Unidade"})`;
}
