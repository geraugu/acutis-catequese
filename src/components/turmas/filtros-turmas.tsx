import type { FiltroSituacaoTurma } from "@/modules/turmas/domain/filtros";

const OPCOES_SITUACAO: { valor: FiltroSituacaoTurma; rotulo: string }[] = [
  { valor: "abertas", rotulo: "Abertas" },
  { valor: "encerradas", rotulo: "Encerradas" },
  { valor: "todas", rotulo: "Todas" },
];

/** Filtros por GET: a URL é a fonte de verdade e funciona sem JavaScript. */
export function FiltrosTurmas({
  situacao,
  ciclo,
  ciclos,
}: {
  situacao: FiltroSituacaoTurma;
  ciclo: number | "todos";
  ciclos: readonly number[];
}) {
  return (
    <form method="get" className="filtros-turmas">
      <div className="campo">
        <label htmlFor="filtro-situacao">Situação</label>
        <select id="filtro-situacao" name="situacao" defaultValue={situacao}>
          {OPCOES_SITUACAO.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      </div>
      <div className="campo">
        <label htmlFor="filtro-ciclo">Ciclo</label>
        <select id="filtro-ciclo" name="ciclo" defaultValue={String(ciclo)}>
          {ciclos.map((c) => (
            <option key={c} value={String(c)}>
              {c}
            </option>
          ))}
          <option value="todos">Todos</option>
        </select>
      </div>
      <button type="submit" className="botao botao-secundario">
        Filtrar
      </button>
    </form>
  );
}
