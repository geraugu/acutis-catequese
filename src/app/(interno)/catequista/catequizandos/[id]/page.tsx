import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/modules/auth/dal";
import { podeVerCatequizando } from "@/modules/turmas/acesso";
import { obterCatequizando } from "@/modules/catequizandos/repositorio";
import { FichaCatequizando } from "@/components/catequizandos/ficha-catequizando";

export const metadata: Metadata = {
  title: "Catequizando — Acutis Catequese",
};

/** Ficha em modo leitura para o catequista da turma (9.3, 1.3). */
export default async function CatequizandoCatequistaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await requireRole(["catequista"], `/catequista/catequizandos/${id}`);
  if (!(await podeVerCatequizando(sessao, id))) redirect("/acesso-negado");
  const catequizando = await obterCatequizando(id);
  if (!catequizando) notFound();

  return (
    <>
      <p>
        <Link href="/catequista/turmas">← Voltar</Link>
      </p>
      <div className="pagina-cabecalho">
        <h1>{catequizando.nome}</h1>
      </div>
      <FichaCatequizando catequizando={catequizando} />
    </>
  );
}
