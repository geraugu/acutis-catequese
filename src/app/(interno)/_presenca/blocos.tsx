import { hojeCivil } from "@/modules/compartilhado/datas";
import type { EncontroResumo } from "@/modules/programa/domain/encontro";
import {
  cumpridosDoCatequizando,
  frequenciaDaTurma,
  frequenciaPorTurma,
  obterLimite,
  presencasDoCatequizando,
  temasAtivosNumerados,
} from "@/modules/presenca/repositorio";
import { calcularProgressoCatequizando } from "@/modules/presenca/domain/progresso-catequizando";
import { ChamadaDeHoje } from "@/components/presenca/chamada-de-hoje";
import { FrequenciaTurma, type OrdemFrequencia } from "@/components/presenca/frequencia-turma";
import { FrequenciaCatequizando } from "@/components/presenca/frequencia-catequizando";

/** Blocos de presença (chamados com await pelas páginas, como as de paginas.tsx), iguais para os dois papéis (2.8, 5.5, 5.6, 6.2, 8.2). */
type Papel = "coordenacao" | "catequista";

/** `?ordem=`: só "frequencia" muda a ordem; qualquer outro valor cai em "nome" (6.4). */
export function ordemDaBusca(valor: string | string[] | undefined): OrdemFrequencia {
  return (Array.isArray(valor) ? valor[0] : valor) === "frequencia" ? "frequencia" : "nome";
}

/** Chamada de hoje (turma aberta) e frequência da turma, ordenável (2.8, 6.2, 6.5). */
export async function BlocoFrequenciaDaTurma({
  papel,
  turmaId,
  encerrada,
  encontros,
  ordem,
}: {
  papel: Papel;
  turmaId: string;
  encerrada: boolean;
  encontros: readonly EncontroResumo[];
  ordem: OrdemFrequencia;
}) {
  const hoje = hojeCivil();
  const doDia = encontros
    .filter((e) => e.situacao === "planejado" && e.data === hoje)
    .sort((a, b) => a.horario.localeCompare(b.horario))[0];
  const [itens, limite] = await Promise.all([frequenciaDaTurma(turmaId), obterLimite()]);

  return (
    <>
      <ChamadaDeHoje
        encontro={
          doDia
            ? {
                id: doDia.id,
                data: doDia.data,
                horario: doDia.horario,
                temaTitulo: doDia.tema?.titulo ?? null,
                situacao: doDia.situacao,
              }
            : null
        }
        turmaEncerrada={encerrada}
        hoje={hoje}
        hrefChamada={doDia ? `/${papel}/turmas/${turmaId}/encontros/${doDia.id}/chamada` : ""}
      />
      <section className="turma-secao" aria-labelledby="turma-frequencia">
        <h2 id="turma-frequencia">Frequência</h2>
        <FrequenciaTurma
          itens={itens.map((i) => ({ ...i, href: `/${papel}/catequizandos/${i.catequizandoId}` }))}
          limite={limite}
          ordem={ordem}
          hrefOrdenar={(o) => `/${papel}/turmas/${turmaId}?ordem=${o}`}
        />
      </section>
    </>
  );
}

/** Frequência por turma, presenças e progresso na ficha do catequizando (5.5, 5.6, 8.2). */
export async function BlocoFrequenciaDoCatequizando({
  catequizandoId,
}: {
  catequizandoId: string;
}) {
  const [turmas, presencas, limite, temas, cumpridos] = await Promise.all([
    frequenciaPorTurma(catequizandoId),
    presencasDoCatequizando(catequizandoId),
    obterLimite(),
    temasAtivosNumerados(),
    cumpridosDoCatequizando(catequizandoId),
  ]);

  return (
    <section className="turma-secao" aria-labelledby="ficha-frequencia">
      <h2 id="ficha-frequencia">Frequência e progresso</h2>
      <FrequenciaCatequizando
        turmas={turmas}
        limite={limite}
        presencas={presencas}
        progresso={calcularProgressoCatequizando(temas, cumpridos)}
      />
    </section>
  );
}
