import { compararDatas, type DataCivil } from "@/modules/compartilhado/datas";
import type { SituacaoEncontro } from "@/modules/programa/domain/encontro";
import { STATUS_PRESENCA, type StatusPresenca } from "./frequencia";

export type ModoChamada = "nova" | "correcao";
export type MotivoSemChamada = "turma-encerrada" | "cancelado" | "data-futura";

export type Disponibilidade =
  | { disponivel: true; modo: ModoChamada }
  | { disponivel: false; motivo: MotivoSemChamada; mensagem: string };

export interface LinhaChamada {
  catequizandoId: string;
  nome: string;
  status: StatusPresenca | null;
}

const MENSAGENS_SEM_CHAMADA: Record<MotivoSemChamada, string> = {
  "turma-encerrada": "Esta turma está encerrada e não aceita chamada.",
  cancelado: "Este encontro foi cancelado e não tem chamada.",
  "data-futura": "A chamada só fica disponível a partir da data do encontro.",
};

function indisponivel(motivo: MotivoSemChamada): Disponibilidade {
  return { disponivel: false, motivo, mensagem: MENSAGENS_SEM_CHAMADA[motivo] };
}

/** Define se há chamada e em que modo: turma encerrada, cancelado e data futura, nesta ordem (2.5). */
export function disponibilidadeDaChamada(
  encontro: { situacao: SituacaoEncontro; data: DataCivil },
  turma: { encerrada: boolean },
  hoje: DataCivil,
): Disponibilidade {
  if (turma.encerrada) return indisponivel("turma-encerrada");
  if (encontro.situacao === "cancelado") return indisponivel("cancelado");
  if (encontro.situacao === "realizado") return { disponivel: true, modo: "correcao" };
  if (compararDatas(encontro.data, hoje) > 0) return indisponivel("data-futura");
  return { disponivel: true, modo: "nova" };
}

/** Inscrito na data: entrada até a data e saída (exclusiva) depois dela (2.1, 3.3). */
export function inscritoNaData(
  inscricao: { dataEntrada: DataCivil; dataSaida: DataCivil | null },
  data: DataCivil,
): boolean {
  if (compararDatas(inscricao.dataEntrada, data) > 0) return false;
  return inscricao.dataSaida === null || compararDatas(data, inscricao.dataSaida) < 0;
}

/** Une os elegíveis aos registros de inscritos, em ordem alfabética; visitantes ficam de fora (3.1, 4.7). */
export function montarLinhas(
  elegiveis: readonly { catequizandoId: string; nome: string }[],
  registros: readonly {
    catequizandoId: string;
    nome: string;
    status: StatusPresenca;
    visitante: boolean;
  }[],
): LinhaChamada[] {
  const visitantes = new Set(registros.filter((r) => r.visitante).map((r) => r.catequizandoId));
  const porId = new Map<string, LinhaChamada>();
  for (const e of elegiveis) {
    if (visitantes.has(e.catequizandoId)) continue;
    porId.set(e.catequizandoId, { catequizandoId: e.catequizandoId, nome: e.nome, status: null });
  }
  for (const r of registros) {
    if (r.visitante) continue;
    porId.set(r.catequizandoId, {
      catequizandoId: r.catequizandoId,
      nome: r.nome,
      status: r.status,
    });
  }
  return [...porId.values()].sort(
    (a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }) ||
      a.catequizandoId.localeCompare(b.catequizandoId),
  );
}

export type MarcacoesLidas = Map<string, StatusPresenca>;

function statusValido(valor: unknown): valor is StatusPresenca {
  return typeof valor === "string" && (STATUS_PRESENCA as readonly string[]).includes(valor);
}

/** Lê `status:<id>` do formulário só para os ids esperados; ausente ou inválido vira null (2.4). */
export function lerMarcacoes(
  dados: FormData,
  ids: readonly string[],
): Map<string, StatusPresenca | null> {
  const lidas = new Map<string, StatusPresenca | null>();
  for (const id of ids) {
    const valor = dados.get(`status:${id}`);
    lidas.set(id, statusValido(valor) ? valor : null);
  }
  return lidas;
}

export type ResultadoValidacao =
  | { ok: true; marcacoes: MarcacoesLidas }
  | { ok: false; razao: "sem-inscritos" }
  | { ok: false; razao: "faltantes"; faltantes: string[] };

/** Exige ao menos um inscrito e todos marcados; ids fora das linhas são ignorados (2.4, 2.6). */
export function validarMarcacoes(
  linhas: readonly LinhaChamada[],
  lidas: ReadonlyMap<string, StatusPresenca | null>,
): ResultadoValidacao {
  if (linhas.length === 0) return { ok: false, razao: "sem-inscritos" };
  const marcacoes: MarcacoesLidas = new Map();
  const faltantes: string[] = [];
  for (const linha of linhas) {
    const status = lidas.get(linha.catequizandoId) ?? null;
    if (status === null) faltantes.push(linha.catequizandoId);
    else marcacoes.set(linha.catequizandoId, status);
  }
  if (faltantes.length > 0) return { ok: false, razao: "faltantes", faltantes };
  return { ok: true, marcacoes };
}

/** Visitantes só com tema, turma aberta e chamada disponível (4.1, 4.4). */
export function podeGerenciarVisitantes(
  encontro: { temaId: string | null; situacao: SituacaoEncontro; data: DataCivil },
  turma: { encerrada: boolean },
  hoje: DataCivil,
): boolean {
  if (encontro.temaId === null || turma.encerrada) return false;
  return disponibilidadeDaChamada(encontro, turma, hoje).disponivel;
}
