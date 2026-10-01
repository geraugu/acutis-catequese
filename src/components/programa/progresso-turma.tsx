import type { Progresso } from "@/modules/programa/domain/progresso";

/** Progresso da turma no programa (6.4, 6.5): realizados de total e os temas pendentes. */
export function ProgressoTurma({ progresso }: { progresso: Progresso }) {
  return (
    <section className="progresso-turma" aria-label="Progresso no programa">
      <p className="progresso-resumo">{`${progresso.realizados} de ${progresso.total} temas`}</p>
      {progresso.pendentes.length > 0 ? (
        <details className="progresso-pendentes">
          <summary>Ver temas pendentes</summary>
          <ol>
            {progresso.pendentes.map((tema) => (
              <li key={tema.id}>{`${tema.numero}. ${tema.titulo}`}</li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}
