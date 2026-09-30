import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/modules/auth/dal";
import { listarMembros } from "@/modules/equipe/repositorio";
import { paginar } from "@/modules/compartilhado/busca";
import { filtrarMembros } from "@/modules/equipe/domain/busca";
import type { FiltroSituacao } from "@/modules/equipe/domain/membro";
import { Aviso } from "@/components/equipe/aviso";
import { BuscaEquipe } from "@/components/equipe/busca-equipe";
import { ListaMembros } from "@/components/equipe/lista-membros";
import { Paginacao } from "@/components/equipe/paginacao";

export const metadata: Metadata = {
  title: "Equipe — Acutis Catequese",
};

type Params = Record<string, string | string[] | undefined>;

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

function lerSituacao(valor: string | undefined): FiltroSituacao {
  return valor === "inativo" || valor === "todos" ? valor : "ativo";
}

export default async function EquipePage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireRole(["coordenacao"], "/coordenacao/equipe");
  const params = await searchParams;
  const termo = primeiro(params.q)?.trim() || undefined;
  const situacao = lerSituacao(primeiro(params.situacao));
  const numero = Number(primeiro(params.pagina) ?? "1");

  const membros = await listarMembros();
  const pagina = paginar(filtrarMembros(membros, { termo, situacao }), numero);

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Equipe</h1>
        <Link href="/coordenacao/equipe/novo" className="botao botao-primario">
          Cadastrar membro
        </Link>
      </div>
      <Aviso codigo={primeiro(params.aviso)} />
      <BuscaEquipe termo={termo} situacao={situacao} />
      <ListaMembros membros={pagina.itens} />
      <Paginacao
        pagina={pagina.pagina}
        totalPaginas={pagina.totalPaginas}
        termo={termo}
        situacao={situacao}
      />
    </>
  );
}
