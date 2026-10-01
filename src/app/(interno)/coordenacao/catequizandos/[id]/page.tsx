import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/modules/auth/dal";
import { obterCatequizando } from "@/modules/catequizandos/repositorio";
import {
  confirmarFichaAction,
  inativarCatequizandoAction,
  reativarCatequizandoAction,
  recusarFichaAction,
} from "@/modules/catequizandos/actions";
import { Aviso } from "@/components/comum/aviso";
import { mensagemDeAviso } from "@/modules/catequizandos/mensagens";
import { AcoesEstado } from "@/components/catequizandos/acoes-estado";
import { FichaCatequizando } from "@/components/catequizandos/ficha-catequizando";

export const metadata: Metadata = {
  title: "Catequizando — Acutis Catequese",
};

type Busca = Record<string, string | string[] | undefined>;

export default async function CatequizandoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Busca>;
}) {
  const { id } = await params;
  await requireRole(["coordenacao"], `/coordenacao/catequizandos/${id}`);
  const busca = await searchParams;
  const catequizando = await obterCatequizando(id);
  if (!catequizando) notFound();

  const aviso = Array.isArray(busca.aviso) ? busca.aviso[0] : busca.aviso;

  return (
    <>
      <p>
        <Link href="/coordenacao/catequizandos">← Voltar para os catequizandos</Link>
      </p>
      <div className="pagina-cabecalho">
        <h1>{catequizando.nome}</h1>
      </div>
      <Aviso mensagem={mensagemDeAviso(aviso)} />
      <FichaCatequizando catequizando={catequizando} />
      <div className="membro-acoes">
        <Link href={`/coordenacao/catequizandos/${id}/editar`} className="botao botao-secundario">
          Editar
        </Link>
      </div>
      <AcoesEstado
        nome={catequizando.nome}
        estado={catequizando.estado}
        inativar={inativarCatequizandoAction.bind(null, id)}
        reativar={reativarCatequizandoAction.bind(null, id)}
        confirmar={confirmarFichaAction.bind(null, id)}
        recusar={recusarFichaAction.bind(null, id)}
      />
    </>
  );
}
