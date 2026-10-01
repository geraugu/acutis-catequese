import Link from "next/link";

import { AcoesEncontro } from "@/components/programa/acoes-encontro";
import { type DataCivil, formatarDataComDia } from "@/modules/compartilhado/datas";
import {
  cancelarEncontroAction,
  marcarRealizadoAction,
  reabrirEncontroAction,
} from "@/modules/programa/actions";
import {
  aguardandoConfirmacao,
  ordenarEncontros,
  proximoEncontro,
  ROTULO_SITUACAO,
} from "@/modules/programa/domain/encontro";
import type { EncontroResumo } from "@/modules/programa/repositorio";
import { formatarHorario } from "@/modules/turmas/domain/turma";

function textoTema(tema: EncontroResumo["tema"]): string {
  if (!tema) return "Sem tema do programa";
  return tema.numero !== null ? `${tema.numero}. ${tema.titulo}` : tema.titulo;
}

/** Cronograma da turma em ordem cronológica (5.5, 5.6, 6.1, 6.2, 6.7, 9.4); `acoes` habilita a gestão. */
export function Cronograma({
  encontros,
  hoje,
  base,
  acoes = false,
}: {
  encontros: readonly EncontroResumo[];
  hoje: DataCivil;
  base: string;
  acoes?: boolean;
}) {
  const proximo = proximoEncontro(encontros, hoje);
  return (
    <ol className="cronograma">
      {ordenarEncontros(encontros).map((e) => {
        const dataComDia = formatarDataComDia(e.data);
        return (
          <li key={e.id} className="cronograma-item">
            <span className="cronograma-data">{dataComDia}</span>{" "}
            <span className="cronograma-horario">{formatarHorario(e.horario)}</span>
            <p className="cronograma-tema">
              {textoTema(e.tema)}
              {e.tema && !e.tema.ativo ? (
                <>
                  {" "}
                  <span className="situacao situacao-inativo">Desativado</span>
                </>
              ) : null}
            </p>
            <span className={`situacao situacao-${e.situacao}`}>{ROTULO_SITUACAO[e.situacao]}</span>
            {proximo?.id === e.id ? <span className="selo">Próximo encontro</span> : null}
            {aguardandoConfirmacao(e, hoje) ? (
              <span className="selo">Aguardando confirmação</span>
            ) : null}
            {e.situacao === "cancelado" && e.motivoCancelamento ? (
              <p className="cronograma-motivo">{`Motivo: ${e.motivoCancelamento}`}</p>
            ) : null}
            {acoes ? (
              <div className="cronograma-acoes">
                {e.situacao === "planejado" ? (
                  <Link href={`${base}/${e.id}/editar`} aria-label={`Editar ${dataComDia}`}>
                    Editar
                  </Link>
                ) : null}
                <AcoesEncontro
                  encontro={{
                    data: e.data,
                    situacao: e.situacao,
                    tema: e.tema ? e.tema.titulo : null,
                  }}
                  realizar={marcarRealizadoAction.bind(null, e.turmaId, e.id, base)}
                  cancelar={cancelarEncontroAction.bind(null, e.turmaId, e.id, base)}
                  reabrir={reabrirEncontroAction.bind(null, e.turmaId, e.id, base)}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
