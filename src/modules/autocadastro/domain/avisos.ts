import { estaLotada, formatarOcupacao } from "@/modules/turmas/domain/turma";

export interface Coincidente {
  id: string;
  nome: string;
  /** Falso quando quem revisa não pode ver esse catequizando (6.2, 6.3). */
  visivel: boolean;
}

export type AvisoRevisao =
  | { tipo: "duplicata"; coincidentes: Coincidente[] }
  | { tipo: "lotada"; inscritos: number; vagas: number };

/** E-mail para comparação: minúsculas e sem espaços. Vazio vira null. */
export function normalizarEmail(email: string | null | undefined): string | null {
  const limpo = (email ?? "").replace(/\s+/g, "").toLowerCase();
  return limpo === "" ? null : limpo;
}

/** Telefone para comparação: só os dígitos. */
export function normalizarTelefone(telefone: string): string {
  return telefone.replace(/\D/g, "");
}

/** Avisos da ficha na revisão: possível duplicata e turma lotada (6.1, 7.2). */
export function avisosDaFicha(e: {
  coincidentes: Coincidente[];
  inscritos: number;
  vagas: number | null;
}): AvisoRevisao[] {
  const avisos: AvisoRevisao[] = [];
  if (e.coincidentes.length > 0) {
    avisos.push({ tipo: "duplicata", coincidentes: e.coincidentes });
  }
  if (e.vagas !== null && estaLotada(e.inscritos, e.vagas)) {
    avisos.push({ tipo: "lotada", inscritos: e.inscritos, vagas: e.vagas });
  }
  return avisos;
}

/** Texto do aviso. Coincidentes ocultos nunca têm o nome exibido (6.3). */
export function textoDoAviso(aviso: AvisoRevisao): string {
  if (aviso.tipo === "lotada") {
    return `Turma lotada (${formatarOcupacao(aviso.inscritos, aviso.vagas)})`;
  }
  const nomes = aviso.coincidentes.filter((c) => c.visivel).map((c) => c.nome);
  return nomes.length > 0 ? `Possível duplicata: ${nomes.join(", ")}` : "Possível duplicata";
}
