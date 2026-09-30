import Link from "next/link";

import { ROTULO_PAPEL } from "@/modules/auth/domain/papeis";
import type { Situacao } from "@/modules/equipe/domain/membro";
import { formatarTelefone } from "@/modules/equipe/domain/telefone";
import type { MembroResumo } from "@/modules/equipe/repositorio";

const ROTULO_SITUACAO: Record<Situacao, string> = { ativo: "Ativo", inativo: "Inativo" };

/** Lista da equipe em linhas separadas por borda; sem membros, mostra o estado vazio. */
export function ListaMembros({ membros }: { membros: readonly MembroResumo[] }) {
  if (membros.length === 0) {
    return (
      <div className="lista-vazia">
        <h2>Nenhum membro encontrado</h2>
        <p>Tente outro termo ou mude a situação.</p>
        <Link href="/coordenacao/equipe" className="botao botao-secundario">
          Limpar busca
        </Link>
      </div>
    );
  }

  return (
    <ul className="lista-membros">
      {membros.map((m) => (
        <li key={m.id} className="lista-membros-item">
          <Link href={`/coordenacao/equipe/${m.id}`} className="lista-membros-nome">
            {m.nome}
          </Link>
          <span className="etiqueta">{ROTULO_PAPEL[m.papel]}</span>
          <span className="lista-membros-telefone">{m.telefone ? formatarTelefone(m.telefone) : "—"}</span>
          <span className={`situacao situacao-${m.situacao}`}>{ROTULO_SITUACAO[m.situacao]}</span>
        </li>
      ))}
    </ul>
  );
}
