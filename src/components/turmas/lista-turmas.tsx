import Link from "next/link";

import {
  estaLotada,
  formatarHorario,
  formatarOcupacao,
  ROTULO_DIA,
} from "@/modules/turmas/domain/turma";
import type { TurmaResumo } from "@/modules/turmas/repositorio";

function ocupacao(t: TurmaResumo): string {
  if (t.vagas !== null) return formatarOcupacao(t.inscritosVigentes, t.vagas);
  return t.inscritosVigentes === 1 ? "1 inscrito" : `${t.inscritosVigentes} inscritos`;
}

/** Lista de turmas; `base` define o destino do link (coordenação ou catequista). */
export function ListaTurmas({ turmas, base }: { turmas: readonly TurmaResumo[]; base: string }) {
  return (
    <ul className="lista-turmas">
      {turmas.map((t) => (
        <li key={t.id} className="lista-turmas-item">
          <Link href={`${base}/${t.id}`} className="lista-turmas-nome">
            {t.nome}
          </Link>
          <span className="lista-turmas-ciclo">{t.ciclo}</span>
          <span className="lista-turmas-encontro">
            {`${ROTULO_DIA[t.diaSemana]}, ${formatarHorario(t.horario)}`}
          </span>
          <span className="lista-turmas-local">{t.local ?? "—"}</span>
          {t.catequistas.length > 0 ? (
            <span className="lista-turmas-catequistas">
              {t.catequistas.map((c) => c.nome).join(", ")}
            </span>
          ) : (
            !t.encerrada && <span className="etiqueta">Sem catequista</span>
          )}
          <span className="lista-turmas-ocupacao">{ocupacao(t)}</span>
          {estaLotada(t.inscritosVigentes, t.vagas) && <span className="etiqueta">Lotada</span>}
          {t.encerrada && <span className="situacao situacao-inativo">Encerrada</span>}
        </li>
      ))}
    </ul>
  );
}
