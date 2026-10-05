import { compararDatas, type DataCivil } from "@/modules/compartilhado/datas";
import type { TemaDoProgresso } from "@/modules/programa/domain/progresso";

export interface TemaCumprido {
  temaId: string;
  titulo: string;
  numero: number;
  turmaNome: string;
  data: DataCivil;
  visitante: boolean;
}

export interface ProgressoCatequizando {
  cumpridos: TemaCumprido[];
  total: number;
  pendentes: TemaDoProgresso[];
}

/**
 * Progresso do catequizando no programa (8.1, 8.3, 8.4, 8.6). `presencas` já vem filtrada
 * (status presente em encontro realizado). Só temas ativos contam; com mais de uma presença
 * no mesmo tema, vale a de data mais antiga. `cumpridos` sai na ordem do programa (número)
 * e `pendentes` mantém a ordem recebida.
 */
export function calcularProgressoCatequizando(
  temasAtivos: readonly TemaDoProgresso[],
  presencas: readonly {
    temaId: string;
    turmaNome: string;
    data: DataCivil;
    visitante: boolean;
  }[],
): ProgressoCatequizando {
  const porTema = new Map<string, TemaDoProgresso>(temasAtivos.map((tema) => [tema.id, tema]));
  const maisAntigas = new Map<string, (typeof presencas)[number]>();
  for (const presenca of presencas) {
    if (!porTema.has(presenca.temaId)) continue;
    const atual = maisAntigas.get(presenca.temaId);
    if (!atual || compararDatas(presenca.data, atual.data) < 0)
      maisAntigas.set(presenca.temaId, presenca);
  }
  const cumpridos: TemaCumprido[] = [];
  for (const [temaId, presenca] of maisAntigas) {
    const tema = porTema.get(temaId);
    if (!tema) continue;
    cumpridos.push({
      temaId,
      titulo: tema.titulo,
      numero: tema.numero,
      turmaNome: presenca.turmaNome,
      data: presenca.data,
      visitante: presenca.visitante,
    });
  }
  cumpridos.sort((a, b) => a.numero - b.numero);
  const pendentes = temasAtivos
    .filter((tema) => !maisAntigas.has(tema.id))
    .map(({ id, titulo, numero }) => ({ id, titulo, numero }));
  return { cumpridos, total: temasAtivos.length, pendentes };
}
