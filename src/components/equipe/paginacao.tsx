import Link from "next/link";

import type { FiltroSituacao } from "@/modules/equipe/domain/membro";

interface Props {
  pagina: number;
  totalPaginas: number;
  termo?: string;
  situacao: FiltroSituacao;
}

/** Monta a URL da lista preservando a busca; omite os valores padrão. */
function urlDaPagina(pagina: number, termo: string | undefined, situacao: FiltroSituacao): string {
  const params = new URLSearchParams();
  if (termo) params.set("q", termo);
  if (situacao !== "ativo") params.set("situacao", situacao);
  if (pagina > 1) params.set("pagina", String(pagina));
  const query = params.toString();
  return query ? `/coordenacao/equipe?${query}` : "/coordenacao/equipe";
}

/** Links "Anterior" e "Próxima" preservando termo e situação. */
export function Paginacao({ pagina, totalPaginas, termo, situacao }: Props) {
  if (totalPaginas <= 1) return null;
  return (
    <nav aria-label="Paginação" className="paginacao">
      {pagina > 1 ? (
        <Link href={urlDaPagina(pagina - 1, termo, situacao)} className="botao botao-secundario">
          Anterior
        </Link>
      ) : null}
      <span className="paginacao-posicao">
        Página {pagina} de {totalPaginas}
      </span>
      {pagina < totalPaginas ? (
        <Link href={urlDaPagina(pagina + 1, termo, situacao)} className="botao botao-secundario">
          Próxima
        </Link>
      ) : null}
    </nav>
  );
}
