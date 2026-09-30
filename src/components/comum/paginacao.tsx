import Link from "next/link";

interface Props {
  base: string;
  pagina: number;
  totalPaginas: number;
  parametros: Record<string, string | undefined>;
}

/** Monta a URL preservando os parâmetros; omite os vazios e `pagina=1`. */
function urlDaPagina(base: string, pagina: number, parametros: Props["parametros"]): string {
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor) params.set(chave, valor);
  }
  if (pagina > 1) params.set("pagina", String(pagina));
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

/** Links "Anterior" e "Próxima" preservando os parâmetros da lista. */
export function Paginacao({ base, pagina, totalPaginas, parametros }: Props) {
  if (totalPaginas <= 1) return null;
  return (
    <nav aria-label="Paginação" className="paginacao">
      {pagina > 1 ? (
        <Link href={urlDaPagina(base, pagina - 1, parametros)} className="botao botao-secundario">
          Anterior
        </Link>
      ) : null}
      <span className="paginacao-posicao">
        Página {pagina} de {totalPaginas}
      </span>
      {pagina < totalPaginas ? (
        <Link href={urlDaPagina(base, pagina + 1, parametros)} className="botao botao-secundario">
          Próxima
        </Link>
      ) : null}
    </nav>
  );
}
