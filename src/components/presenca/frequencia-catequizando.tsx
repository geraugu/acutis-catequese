import { plural } from "@/components/presenca/resumo-chamada";
import { StatusPresenca as SeloStatus } from "@/components/presenca/status-presenca";
import { formatarData, formatarDataComDia, type DataCivil } from "@/modules/compartilhado/datas";
import {
  calcularFrequencia,
  emAlerta,
  type ContagemFrequencia,
  type StatusPresenca,
} from "@/modules/presenca/domain/frequencia";
import type { ProgressoCatequizando } from "@/modules/presenca/domain/progresso-catequizando";

// Tipos estruturais: o repositório é `server-only` e não pode ser importado aqui.
export interface TurmaDoCatequizando {
  turmaId: string;
  turmaNome: string;
  ciclo: number;
  atual: boolean;
  contagem: ContagemFrequencia;
}

export interface PresencaDoCatequizando {
  data: DataCivil;
  horario?: string;
  turmaNome: string;
  temaTitulo: string | null;
  status: StatusPresenca;
  visitante: boolean;
}

interface FrequenciaCatequizandoProps {
  turmas: TurmaDoCatequizando[];
  limite: number;
  presencas: PresencaDoCatequizando[];
  progresso: ProgressoCatequizando;
}

function textoContagens(c: ContagemFrequencia): string {
  return [
    plural(c.presentes, "presente", "presentes"),
    plural(c.ausentes, "ausente", "ausentes"),
    plural(c.justificados, "justificado", "justificados"),
  ].join(" · ");
}

function IconeAlerta() {
  return (
    <svg
      className="presenca-icone"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 10v5M12 18v.01" />
    </svg>
  );
}

/** Frequência, presenças e progresso da ficha do catequizando (5.6, 5.7, 8.2, 8.3, 10.5). */
export function FrequenciaCatequizando({
  turmas,
  limite,
  presencas,
  progresso,
}: FrequenciaCatequizandoProps) {
  return (
    <div>
      <section aria-labelledby="freq-turmas">
        <h3 id="freq-turmas">Frequência por turma</h3>
        <ul className="presenca-inscritos">
          {turmas.map((turma) => {
            const frequencia = calcularFrequencia(turma.contagem);
            return (
              <li
                key={turma.turmaId}
                className={`presenca-inscrito${turma.atual ? " presenca-turma-atual" : ""}`}
              >
                <span className="presenca-inscrito-nome">{turma.turmaNome}</span>
                <span className="presenca-contagens">{`Ciclo ${turma.ciclo}`}</span>
                {turma.atual ? <span className="presenca-selo-visitante">Turma atual</span> : null}
                <span className="presenca-percentual">
                  {frequencia.percentual === null
                    ? "Sem encontros registrados"
                    : `${frequencia.percentual}%`}
                </span>
                <span className="presenca-contagens">{textoContagens(turma.contagem)}</span>
                {turma.atual && emAlerta(turma.contagem, limite) ? (
                  <span className="presenca-selo-baixa">
                    <IconeAlerta />
                    <span>Baixa frequência</span>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="freq-presencas">
        <h3 id="freq-presencas">Presenças</h3>
        {presencas.length === 0 ? (
          <p>Nenhuma presença registrada.</p>
        ) : (
          <ul aria-label="Presenças" className="presenca-inscritos">
            {presencas.map((p, i) => (
              <li key={`${p.data}-${i}`} className="presenca-inscrito">
                <span className="presenca-inscrito-nome">
                  {formatarDataComDia(p.data)}
                  {p.horario ? ` · ${p.horario}` : ""}
                </span>
                <span className="presenca-contagens">{p.turmaNome}</span>
                <span>{p.temaTitulo ?? "Sem tema do programa"}</span>
                <SeloStatus status={p.status} />
                {p.visitante ? <span className="presenca-selo-visitante">Visitante</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="freq-progresso">
        <h3 id="freq-progresso">Progresso no programa</h3>
        <p className="progresso-resumo">{`${progresso.cumpridos.length} de ${progresso.total} temas`}</p>
        {progresso.cumpridos.length === 0 ? (
          <p>Nenhum tema cumprido ainda.</p>
        ) : (
          <ul aria-label="Temas cumpridos" className="presenca-inscritos">
            {progresso.cumpridos.map((tema) => (
              <li key={tema.temaId} className="presenca-inscrito">
                <span className="presenca-inscrito-nome">{`${tema.numero}. ${tema.titulo}`}</span>
                <span className="presenca-origem">
                  {`${tema.visitante ? "Cumprido por reposição" : "Cumprido"} na turma ${tema.turmaNome} em ${formatarData(tema.data)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
        {progresso.pendentes.length === 0 ? (
          <p>Todos os temas cumpridos.</p>
        ) : (
          <details className="progresso-pendentes">
            <summary>Ver temas pendentes</summary>
            <ol aria-label="Temas pendentes">
              {progresso.pendentes.map((tema) => (
                <li key={tema.id}>{`${tema.numero}. ${tema.titulo}`}</li>
              ))}
            </ol>
          </details>
        )}
      </section>
    </div>
  );
}
