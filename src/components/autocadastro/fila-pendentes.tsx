import Link from "next/link";

export interface ItemFilaPendentes {
  id: string;
  nome: string;
  recebidaEm: Date;
  /** Textos já montados com `textoDoAviso` (respeitando a visibilidade, 6.3). */
  avisos: string[];
}

const FORMATO_ENVIO = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
});

/** Fila de fichas pendentes da turma, da mais antiga para a mais recente (5.1). */
export function FilaPendentes({ itens, base }: { itens: ItemFilaPendentes[]; base: string }) {
  if (itens.length === 0) return <p>Nenhuma ficha pendente.</p>;
  const ordenados = [...itens].sort((a, b) => a.recebidaEm.getTime() - b.recebidaEm.getTime());
  return (
    <ul className="lista-pendentes" aria-label="Fichas pendentes">
      {ordenados.map((item) => (
        <li key={item.id}>
          <Link href={`${base}/${item.id}`}>{item.nome}</Link>
          <span> Enviada em {FORMATO_ENVIO.format(item.recebidaEm)}</span>
          {item.avisos.length > 0 ? (
            <ul className="avisos-ficha" aria-label="Avisos">
              {item.avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
