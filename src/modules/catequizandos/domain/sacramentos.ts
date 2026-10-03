/** Sacramentos da ficha, sem dependências (seguro para componentes cliente, sem puxar o zod). */
export const SACRAMENTOS = ["batismo", "eucaristia", "crisma"] as const;
export type Sacramento = (typeof SACRAMENTOS)[number];

export const ROTULO_SACRAMENTO: Record<Sacramento, string> = {
  batismo: "Batismo",
  eucaristia: "Eucaristia",
  crisma: "Crisma",
};
