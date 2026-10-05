import Link from "next/link";

import { formatarDataComDia, type DataCivil } from "@/modules/compartilhado/datas";
import type { SituacaoEncontro } from "@/modules/programa/domain/encontro";

interface ChamadaDeHojeProps {
  encontro: {
    id: string;
    data: DataCivil;
    horario: string;
    temaTitulo: string | null;
    situacao: SituacaoEncontro;
  } | null;
  turmaEncerrada: boolean;
  hoje: DataCivil;
  hrefChamada: string;
}

/** Destaca o encontro de hoje ainda sem chamada, com o link para fazê-la (6.3). */
export function ChamadaDeHoje({ encontro, turmaEncerrada, hoje, hrefChamada }: ChamadaDeHojeProps) {
  if (!encontro || turmaEncerrada || encontro.situacao !== "planejado" || encontro.data !== hoje) {
    return null;
  }
  return (
    <section aria-labelledby="chamada-de-hoje-titulo" className="presenca-barra">
      <div>
        <h2 id="chamada-de-hoje-titulo">Encontro de hoje</h2>
        <p>
          {formatarDataComDia(encontro.data)} · {encontro.horario} ·{" "}
          {encontro.temaTitulo ?? "Sem tema do programa"}
        </p>
      </div>
      <Link href={hrefChamada} className="botao">
        Fazer chamada
      </Link>
    </section>
  );
}
