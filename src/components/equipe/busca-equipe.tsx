import type { FiltroSituacao } from "@/modules/equipe/domain/membro";

const OPCOES: { valor: FiltroSituacao; rotulo: string }[] = [
  { valor: "ativo", rotulo: "Ativos" },
  { valor: "inativo", rotulo: "Inativos" },
  { valor: "todos", rotulo: "Todos" },
];

/** Busca por GET: a URL é a fonte de verdade e funciona sem JavaScript. */
export function BuscaEquipe({ termo = "", situacao }: { termo?: string; situacao: FiltroSituacao }) {
  return (
    <form method="get" action="/coordenacao/equipe" role="search" className="busca-equipe">
      <div className="campo busca-termo">
        <label htmlFor="busca-q">Nome, e-mail ou telefone</label>
        <input id="busca-q" name="q" type="search" defaultValue={termo} />
      </div>
      <div className="campo busca-situacao">
        <label htmlFor="busca-situacao">Situação</label>
        <select id="busca-situacao" name="situacao" defaultValue={situacao}>
          {OPCOES.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="botao botao-secundario">
        Buscar
      </button>
    </form>
  );
}
