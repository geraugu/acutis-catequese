import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/modules/auth/dal";
import { obterTema } from "@/modules/programa/repositorio";
import { editarTemaAction } from "@/modules/programa/actions";
import { FormularioTema } from "@/components/programa/formulario-tema";

export const metadata: Metadata = {
  title: "Editar tema — Acutis Catequese",
};

export default async function EditarTemaPage({ params }: { params: Promise<{ temaId: string }> }) {
  const { temaId } = await params;
  await requireRole(["coordenacao"], `/coordenacao/programa/${temaId}/editar`);
  const tema = await obterTema(temaId);
  if (!tema) notFound();

  return (
    <>
      <p>
        <Link href={`/coordenacao/programa/${temaId}`}>← Voltar para {tema.titulo}</Link>
      </p>
      <h1>Editar tema</h1>
      <FormularioTema
        modo="editar"
        acao={editarTemaAction.bind(null, temaId)}
        valoresIniciais={{ titulo: tema.titulo, descricao: tema.descricao ?? "" }}
      />
    </>
  );
}
