import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/modules/auth/dal";
import { contarPendentes, listarCatequizandos } from "@/modules/catequizandos/repositorio";
import { paginar } from "@/modules/compartilhado/busca";
import { hojeCivil } from "@/modules/compartilhado/datas";
import { filtrarCatequizandos } from "@/modules/catequizandos/domain/busca";
import type { FiltroEstado } from "@/modules/catequizandos/domain/estado";
import { SACRAMENTOS, type Sacramento } from "@/modules/catequizandos/domain/ficha";
import { Aviso } from "@/components/comum/aviso";
import { Paginacao } from "@/components/comum/paginacao";
import { mensagemDeAviso } from "@/modules/catequizandos/mensagens";
import { BuscaCatequizandos } from "@/components/catequizandos/busca-catequizandos";
import { ListaCatequizandos } from "@/components/catequizandos/lista-catequizandos";

export const metadata: Metadata = {
  title: "Catequizandos — Acutis Catequese",
};

type Params = Record<string, string | string[] | undefined>;

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

function lerEstado(valor: string | undefined): FiltroEstado {
  return valor === "pendente" || valor === "inativo" || valor === "todos" ? valor : "ativo";
}

function lerSacramento(valor: string | undefined): Sacramento | undefined {
  return SACRAMENTOS.find((s) => s === valor);
}

export default async function CatequizandosPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  await requireRole(["coordenacao"], "/coordenacao/catequizandos");
  const params = await searchParams;
  const termo = primeiro(params.q)?.trim() || undefined;
  const estado = lerEstado(primeiro(params.estado));
  const semSacramento = lerSacramento(primeiro(params.sem));
  const numero = Number(primeiro(params.pagina) ?? "1");
  const hoje = hojeCivil();

  const [catequizandos, pendentes] = await Promise.all([listarCatequizandos(), contarPendentes()]);
  const pagina = paginar(
    filtrarCatequizandos(catequizandos, { termo, estado, semSacramento }),
    numero,
  );

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Catequizandos</h1>
        <Link href="/coordenacao/catequizandos/novo" className="botao botao-primario">
          Cadastrar catequizando
        </Link>
      </div>
      <Aviso mensagem={mensagemDeAviso(primeiro(params.aviso))} />
      {pendentes > 0 ? (
        <p className="catequizandos-pendentes">
          <Link href="/coordenacao/catequizandos?estado=pendente">
            {pendentes === 1 ? "1 ficha pendente" : `${pendentes} fichas pendentes`}
          </Link>
        </p>
      ) : null}
      <BuscaCatequizandos termo={termo} estado={estado} semSacramento={semSacramento} />
      <ListaCatequizandos catequizandos={pagina.itens} hoje={hoje} />
      <Paginacao
        pagina={pagina.pagina}
        totalPaginas={pagina.totalPaginas}
        base="/coordenacao/catequizandos"
        parametros={{
          q: termo,
          estado: estado === "ativo" ? undefined : estado,
          sem: semSacramento,
        }}
      />
    </>
  );
}
