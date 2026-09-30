// Valores idênticos ao enum Prisma `EstadoCatequizando`; o domínio não importa Prisma.
export const ESTADOS = ["pendente", "ativo", "inativo"] as const;
export type EstadoCatequizando = (typeof ESTADOS)[number];
export type FiltroEstado = EstadoCatequizando | "todos";
export type Operacao = "inativar" | "reativar" | "confirmar" | "recusar";

const TRANSICOES: Record<EstadoCatequizando, Partial<Record<Operacao, EstadoCatequizando>>> = {
  pendente: { confirmar: "ativo", recusar: "inativo" },
  ativo: { inativar: "inativo" },
  inativo: { reativar: "ativo" },
};

export function transicao(atual: EstadoCatequizando, op: Operacao): EstadoCatequizando | null {
  return TRANSICOES[atual][op] ?? null;
}

export function operacoesDisponiveis(atual: EstadoCatequizando): Operacao[] {
  return Object.keys(TRANSICOES[atual]) as Operacao[];
}

export const ROTULO_ESTADO: Record<EstadoCatequizando, string> = {
  pendente: "Pendente",
  ativo: "Ativo",
  inativo: "Inativo",
};
