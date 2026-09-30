import Link from "next/link";

import { calcularIdade, type DataCivil } from "@/modules/compartilhado/datas";
import { formatarTelefone } from "@/modules/compartilhado/telefone";
import { ROTULO_ESTADO } from "@/modules/catequizandos/domain/estado";
import { ROTULO_SACRAMENTO, SACRAMENTOS } from "@/modules/catequizandos/domain/ficha";
import type { CatequizandoResumo } from "@/modules/catequizandos/repositorio";

/** Selos visuais "B · E · C"; o texto completo fica disponível a leitores de tela e no `title`. */
function SelosSacramentos({
  recebidos,
}: {
  recebidos: CatequizandoResumo["sacramentosRecebidos"];
}) {
  const ordenados = SACRAMENTOS.filter((s) => recebidos.includes(s));
  if (ordenados.length === 0) {
    return <span className="selos-sacramentos selos-vazio">Nenhum sacramento</span>;
  }
  const rotulo = ordenados.map((s) => ROTULO_SACRAMENTO[s]).join(", ");
  return (
    <span className="selos-sacramentos" title={rotulo}>
      <span aria-hidden="true" className="selos-visuais">
        {ordenados.map((s) => (
          <span key={s} className="selo-sacramento">
            {ROTULO_SACRAMENTO[s].charAt(0)}
          </span>
        ))}
      </span>
      <span className="visualmente-oculto">{rotulo}</span>
    </span>
  );
}

/** Lista de catequizandos em linhas separadas por borda; sem resultados, mostra o estado vazio. */
export function ListaCatequizandos({
  catequizandos,
  hoje,
}: {
  catequizandos: readonly CatequizandoResumo[];
  hoje: DataCivil;
}) {
  if (catequizandos.length === 0) {
    return (
      <div className="lista-vazia">
        <h2>Nenhum catequizando encontrado</h2>
        <p>Tente outro termo ou mude os filtros.</p>
        <Link href="/coordenacao/catequizandos" className="botao botao-secundario">
          Limpar busca
        </Link>
      </div>
    );
  }

  return (
    <ul className="lista-membros">
      {catequizandos.map((c) => (
        <li key={c.id} className="lista-membros-item">
          <Link href={`/coordenacao/catequizandos/${c.id}`} className="lista-membros-nome">
            {c.nome}
          </Link>
          <span className="lista-catequizandos-idade">
            {`${calcularIdade(c.dataNascimento, hoje)} anos`}
          </span>
          <span className="lista-membros-telefone">{formatarTelefone(c.telefone)}</span>
          <SelosSacramentos recebidos={c.sacramentosRecebidos} />
          <span className={`situacao estado-${c.estado}`}>{ROTULO_ESTADO[c.estado]}</span>
        </li>
      ))}
    </ul>
  );
}
