import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { requireRole, type SessaoUsuario } from "@/modules/auth/dal";
import { podeVerTurma } from "@/modules/turmas/acesso";
import { mensagemDeAviso as avisoDeTurmas } from "@/modules/turmas/mensagens";
import { mensagemDeAviso as avisoDeAutocadastro } from "@/modules/autocadastro/mensagens";
import { contarPendentesPorTurma } from "@/modules/autocadastro/repositorio";
import { dadosDaTurma } from "@/modules/programa/repositorio";
import type { Papel } from "./abas-config";

export { ABAS, type AbaConfig, type Papel } from "./abas-config";

export interface CabecalhoDaTurma {
  nome: string;
  encerrada: boolean;
  pendentes: number;
}

/**
 * Autoriza a página da aba e devolve a sessão; sem acesso, "/acesso-negado". Nenhum dado
 * da turma é lido antes de `podeVerTurma` passar (9.1, 9.2). `caminho` é o endereço exato
 * da página, usado como retorno do login.
 */
export async function carregarTurmaDaAba(
  papel: Papel,
  turmaId: string,
  caminho: string,
): Promise<SessaoUsuario> {
  const sessao = await requireRole([papel], caminho);
  if (!(await podeVerTurma(sessao, turmaId))) redirect("/acesso-negado");
  return sessao;
}

/** Nome, situação e fichas pendentes; null se a turma não existe. Cache de requisição. */
export const cabecalhoDaTurma = cache(async (turmaId: string): Promise<CabecalhoDaTurma | null> => {
  const turma = await dadosDaTurma(turmaId);
  if (!turma) return null;
  const pendentes = (await contarPendentesPorTurma([turma.id])).get(turma.id) ?? 0;
  return { nome: turma.nome, encerrada: turma.encerrada, pendentes };
});

/** Traduz `?aviso=` com as mensagens de turmas e, depois, de autocadastro; null se desconhecido (8.7). */
export function avisoDaTurma(codigo: string | string[] | undefined): string | null {
  return avisoDeTurmas(codigo) ?? avisoDeAutocadastro(codigo);
}
