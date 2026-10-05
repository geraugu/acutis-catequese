"use server";

import { redirect } from "next/navigation";
import { hojeCivil } from "@/modules/compartilhado/datas";
import { baseValida } from "@/modules/programa/domain/encontro";
import { autorizarTurma } from "./autorizacao";
import {
  disponibilidadeDaChamada,
  lerMarcacoes,
  montarLinhas,
  validarMarcacoes,
} from "./domain/chamada";
import {
  MSG_ERRO_INESPERADO,
  MSG_FALTAM_MARCACOES,
  MSG_SEM_INSCRITOS,
  MSG_SITUACAO_MUDOU,
  MSG_TURMA_ENCERRADA,
} from "./mensagens";
import {
  dadosDoEncontro,
  inscritosNaData,
  presencasDoEncontro,
  salvarChamada,
} from "./repositorio";

export type EstadoPresenca = {
  erro?: string;
  errosCampos?: Partial<Record<string, string>>;
  faltantes?: string[]; // ids sem marcação (2.4)
  valores?: Record<string, string>; // chaves `status:<id>`
};

function nomeDoErro(e: unknown): string {
  return e instanceof Error ? e.name : "desconhecido";
}

/** Marcações enviadas no formulário (`status:<id>`), para devolver ao formulário em caso de erro (10.6). */
function valoresDasMarcacoes(dados: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [campo, valor] of dados.entries()) {
    if (typeof valor === "string" && campo.startsWith("status:")) valores[campo] = valor;
  }
  return valores;
}

/** Salvar a chamada (2.3, 2.4, 2.5, 2.6, 3.2, 3.5, 10.6): tudo ou nada, com aviso na volta ao cronograma. */
export async function salvarChamadaAction(
  turmaId: string,
  encontroId: string,
  base: string,
  _anterior: EstadoPresenca,
  dados: FormData,
): Promise<EstadoPresenca> {
  await autorizarTurma(turmaId); // 1.5: antes de qualquer leitura

  const destino = baseValida(base, turmaId);
  const valores = valoresDasMarcacoes(dados);
  let aviso: "chamada-salva" | "chamada-atualizada";
  try {
    const encontro = await dadosDoEncontro(turmaId, encontroId);
    if (!encontro) return { erro: MSG_ERRO_INESPERADO, valores };

    const disp = disponibilidadeDaChamada(
      encontro,
      { encerrada: encontro.turmaEncerrada },
      hojeCivil(),
    );
    if (!disp.disponivel) {
      return { erro: disp.motivo === "turma-encerrada" ? MSG_TURMA_ENCERRADA : disp.mensagem };
    }

    const linhas = montarLinhas(
      await inscritosNaData(turmaId, encontro.data),
      await presencasDoEncontro(encontroId),
    );
    const lidas = lerMarcacoes(
      dados,
      linhas.map((l) => l.catequizandoId),
    );
    const validacao = validarMarcacoes(linhas, lidas);
    if (!validacao.ok) {
      if (validacao.razao === "sem-inscritos") return { erro: MSG_SEM_INSCRITOS };
      const feitas: Record<string, string> = {};
      for (const [id, status] of lidas) if (status !== null) feitas[`status:${id}`] = status;
      return { erro: MSG_FALTAM_MARCACOES, faltantes: validacao.faltantes, valores: feitas };
    }

    const resultado = await salvarChamada(
      { encontroId, turmaId, modo: disp.modo },
      validacao.marcacoes,
    );
    if (resultado === "situacao-mudou") return { erro: MSG_SITUACAO_MUDOU, valores };
    aviso = disp.modo === "nova" ? "chamada-salva" : "chamada-atualizada";
  } catch (e) {
    console.error("[presenca] falha ao salvar a chamada", {
      turmaId,
      encontroId,
      erro: nomeDoErro(e),
    });
    return { erro: MSG_ERRO_INESPERADO, valores };
  }
  // Fora do try/catch: redirect lança NEXT_REDIRECT.
  redirect(`${destino}?aviso=${aviso}`);
}
