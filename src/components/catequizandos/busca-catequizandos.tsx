import type { FiltroEstado } from "@/modules/catequizandos/domain/estado";
import type { Sacramento } from "@/modules/catequizandos/domain/ficha";

const OPCOES_ESTADO: { valor: FiltroEstado; rotulo: string }[] = [
  { valor: "ativo", rotulo: "Ativos" },
  { valor: "pendente", rotulo: "Pendentes" },
  { valor: "inativo", rotulo: "Inativos" },
  { valor: "todos", rotulo: "Todos" },
];

const OPCOES_SEM: { valor: Sacramento | ""; rotulo: string }[] = [
  { valor: "", rotulo: "Qualquer" },
  { valor: "batismo", rotulo: "Sem batismo" },
  { valor: "eucaristia", rotulo: "Sem eucaristia" },
  { valor: "crisma", rotulo: "Sem crisma" },
];

/** Busca por GET: a URL é a fonte de verdade e funciona sem JavaScript. */
export function BuscaCatequizandos({
  termo = "",
  estado,
  semSacramento,
}: {
  termo?: string;
  estado: FiltroEstado;
  semSacramento?: Sacramento;
}) {
  return (
    <form method="get" action="/coordenacao/catequizandos" role="search" className="busca-equipe">
      <div className="campo busca-termo">
        <label htmlFor="busca-q">Nome, telefone ou e-mail</label>
        <input id="busca-q" name="q" type="search" defaultValue={termo} />
      </div>
      <div className="campo busca-situacao">
        <label htmlFor="busca-estado">Estado</label>
        <select id="busca-estado" name="estado" defaultValue={estado}>
          {OPCOES_ESTADO.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      </div>
      <div className="campo busca-situacao">
        <label htmlFor="busca-sem">Sacramento</label>
        <select id="busca-sem" name="sem" defaultValue={semSacramento ?? ""}>
          {OPCOES_SEM.map((o) => (
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
