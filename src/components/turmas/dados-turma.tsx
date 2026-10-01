import type { TurmaDetalhe } from "@/modules/turmas/repositorio";
import {
  ROTULO_DIA,
  estaLotada,
  formatarHorario,
  formatarOcupacao,
} from "@/modules/turmas/domain/turma";
import { formatarData } from "@/modules/compartilhado/datas";

/** Selos e dados da turma, em modo leitura (compartilhado por coordenação e catequista). */
export function DadosTurma({ turma }: { turma: TurmaDetalhe }) {
  return (
    <>
      <div className="turma-selos">
        {turma.encerrada ? (
          <span className="situacao situacao-inativo">Encerrada</span>
        ) : (
          <span className="situacao situacao-ativo">Aberta</span>
        )}
        {estaLotada(turma.inscritosVigentes, turma.vagas) ? (
          <span className="etiqueta">Lotada</span>
        ) : null}
        {!turma.encerrada && turma.catequistas.length === 0 ? (
          <span className="etiqueta">Sem catequista</span>
        ) : null}
      </div>

      <dl className="membro-dados">
        <div>
          <dt>Ciclo</dt>
          <dd>{turma.ciclo}</dd>
        </div>
        <div>
          <dt>Encontro</dt>
          <dd>
            {ROTULO_DIA[turma.diaSemana]}, {formatarHorario(turma.horario)}
          </dd>
        </div>
        <div>
          <dt>Local</dt>
          <dd>{turma.local || "Não informado"}</dd>
        </div>
        <div>
          <dt>Situação</dt>
          <dd>
            {turma.encerradaEm ? `Encerrada em ${formatarData(turma.encerradaEm)}` : "Aberta"}
          </dd>
        </div>
        {turma.vagas !== null ? (
          <div>
            <dt>Ocupação</dt>
            <dd>{formatarOcupacao(turma.inscritosVigentes, turma.vagas)}</dd>
          </div>
        ) : null}
        {turma.observacoes ? (
          <div>
            <dt>Observações</dt>
            <dd className="turma-observacoes">{turma.observacoes}</dd>
          </div>
        ) : null}
      </dl>
    </>
  );
}
