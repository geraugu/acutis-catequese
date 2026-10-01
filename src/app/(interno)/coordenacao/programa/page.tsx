import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/modules/auth/dal";
import { listarTemas } from "@/modules/programa/repositorio";
import { numerarTemas } from "@/modules/programa/domain/tema";
import { mensagemDeAviso } from "@/modules/programa/mensagens";
import { Aviso } from "@/components/comum/aviso";
import { ListaTemas } from "@/components/programa/lista-temas";

export const metadata: Metadata = {
  title: "Programa — Acutis Catequese",
};

type Params = Record<string, string | string[] | undefined>;

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

/** Programa de catequese com gestão dos temas (1.2, 2.1, 2.5, 2.7, 3.5). */
export default async function ProgramaPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireRole(["coordenacao"], "/coordenacao/programa");
  const params = await searchParams;
  const temas = numerarTemas(await listarTemas());

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Programa</h1>
        <Link href="/coordenacao/programa/novo" className="botao botao-primario">
          Novo tema
        </Link>
      </div>
      <Aviso mensagem={mensagemDeAviso(primeiro(params.aviso))} />
      {temas.length === 0 ? (
        <div className="lista-vazia">
          <h2>Nenhum tema no programa</h2>
          <p>Crie o primeiro tema para montar o programa.</p>
        </div>
      ) : (
        <ListaTemas temas={temas} gestao />
      )}
    </>
  );
}
