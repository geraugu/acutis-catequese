"use server";

import { redirect } from "next/navigation";
import { hojeCivil } from "@/modules/compartilhado/datas";
import { baseValida } from "@/modules/programa/domain/encontro";
import { autorizarTurma, exigirCoordenacao } from "./autorizacao";
import {
  disponibilidadeDaChamada,
  lerMarcacoes,
  montarLinhas,
  podeGerenciarVisitantes,
  validarMarcacoes,
} from "./domain/chamada";
import { limiteSchema } from "./domain/frequencia";
import {
  MSG_ERRO_INESPERADO,
  MSG_FALTAM_MARCACOES,
  MSG_SEM_INSCRITOS,
  MSG_SITUACAO_MUDOU,
  MSG_TURMA_ENCERRADA,
  MSG_VISITANTE_DUPLICADO,
  MSG_VISITANTE_INDISPONIVEL,
  MSG_VISITANTE_SEM_TEMA,
} from "./mensagens";
import {
  adicionarVisitante,
  dadosDoEncontro,
  type DadosDoEncontro,
  inscritosNaData,
  presencasDoEncontro,
  removerVisitante,
  salvarChamada,
  salvarLimite,
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

/** Mensagem de recusa quando visitantes não podem ser gerenciados no encontro (4.1, 4.4). */
function motivoSemVisitantes(encontro: DadosDoEncontro): string {
  if (encontro.turmaEncerrada) return MSG_TURMA_ENCERRADA;
  if (encontro.temaId === null) return MSG_VISITANTE_SEM_TEMA;
  const disp = disponibilidadeDaChamada(encontro, { encerrada: false }, hojeCivil());
  return disp.disponivel ? MSG_ERRO_INESPERADO : disp.mensagem;
}

/**
 * Convenção de `base` nas ações de visitante: é a base do cronograma (a mesma da chamada);
 * a volta é a página de visitantes do encontro, `${base}/${encontroId}/chamada/visitantes`.
 */
async function gerenciarVisitante(
  turmaId: string,
  encontroId: string,
  base: string,
  operacao: (encontro: DadosDoEncontro) => Promise<{ erro: string } | { aviso: string }>,
  rotuloLog: string,
): Promise<EstadoPresenca> {
  await autorizarTurma(turmaId); // 1.5: antes de qualquer leitura

  const destino = baseValida(base, turmaId);
  let aviso: string;
  try {
    const encontro = await dadosDoEncontro(turmaId, encontroId);
    if (!encontro) return { erro: MSG_ERRO_INESPERADO };
    const podeGerenciar = podeGerenciarVisitantes(
      encontro,
      { encerrada: encontro.turmaEncerrada },
      hojeCivil(),
    );
    if (!podeGerenciar) return { erro: motivoSemVisitantes(encontro) };

    const resultado = await operacao(encontro);
    if ("erro" in resultado) return { erro: resultado.erro };
    aviso = resultado.aviso;
  } catch (e) {
    console.error(`[presenca] falha ao ${rotuloLog}`, { turmaId, encontroId, erro: nomeDoErro(e) });
    return { erro: MSG_ERRO_INESPERADO };
  }
  // Fora do try/catch: redirect lança NEXT_REDIRECT.
  redirect(`${destino}/${encontroId}/chamada/visitantes?aviso=${aviso}`);
}

/** Adicionar visitante (4.1, 4.3, 4.4, 4.5, 9.1): presente, com a turma de origem; inscrição intacta. */
export async function adicionarVisitanteAction(
  turmaId: string,
  encontroId: string,
  base: string,
  catequizandoId: string,
): Promise<EstadoPresenca> {
  return gerenciarVisitante(
    turmaId,
    encontroId,
    base,
    async (encontro) => {
      // O repositório não confere isto: quem era inscrito na data não é visitante (4.1).
      const inscritos = await inscritosNaData(turmaId, encontro.data);
      if (inscritos.some((i) => i.catequizandoId === catequizandoId)) {
        return { erro: MSG_VISITANTE_INDISPONIVEL };
      }
      const resultado = await adicionarVisitante({ encontroId, turmaId }, catequizandoId);
      if (resultado === "duplicado") return { erro: MSG_VISITANTE_DUPLICADO };
      if (resultado === "indisponivel") return { erro: MSG_VISITANTE_INDISPONIVEL };
      return { aviso: "visitante-adicionado" };
    },
    "adicionar o visitante",
  );
}

/** Remover visitante (4.6, 4.8, 9.1): só apaga linha de visitante; o progresso é recalculado na leitura. */
export async function removerVisitanteAction(
  turmaId: string,
  encontroId: string,
  base: string,
  catequizandoId: string,
): Promise<EstadoPresenca> {
  return gerenciarVisitante(
    turmaId,
    encontroId,
    base,
    async () =>
      (await removerVisitante(encontroId, catequizandoId))
        ? { aviso: "visitante-removido" }
        : { erro: MSG_VISITANTE_INDISPONIVEL },
    "remover o visitante",
  );
}

/** Salvar o limite de baixa frequência (1.3, 7.2, 7.3, 7.11): só a coordenação; os alertas são recalculados na leitura. */
export async function salvarLimiteAction(
  _anterior: EstadoPresenca,
  dados: FormData,
): Promise<EstadoPresenca> {
  await exigirCoordenacao(); // 1.3: antes de qualquer leitura

  const bruto = dados.get("percentual");
  const valores = { percentual: typeof bruto === "string" ? bruto : "" };
  const resultado = limiteSchema().safeParse(valores.percentual);
  if (!resultado.success) {
    return {
      errosCampos: { percentual: resultado.error.issues[0]?.message ?? MSG_ERRO_INESPERADO },
      valores,
    };
  }
  try {
    await salvarLimite(resultado.data);
  } catch (e) {
    console.error("[presenca] falha ao salvar o limite", { erro: nomeDoErro(e) });
    return { erro: MSG_ERRO_INESPERADO, valores };
  }
  // Fora do try/catch: redirect lança NEXT_REDIRECT.
  redirect("/coordenacao/frequencia?aviso=limite-salvo");
}
