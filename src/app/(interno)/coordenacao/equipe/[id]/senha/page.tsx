import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/modules/auth/dal";
import { obterMembro } from "@/modules/equipe/repositorio";
import { redefinirSenhaAction } from "@/modules/equipe/actions";
import { FormularioSenha } from "@/components/equipe/formulario-senha";

export const metadata: Metadata = {
  title: "Redefinir senha — Acutis Catequese",
};

export default async function RedefinirSenhaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(["coordenacao"], `/coordenacao/equipe/${id}/senha`);
  const membro = await obterMembro(id);
  if (!membro) notFound();

  return (
    <>
      <p>
        <Link href={`/coordenacao/equipe/${id}`}>← Voltar para {membro.nome}</Link>
      </p>
      <h1>Redefinir senha</h1>
      <p>
        Defina uma nova senha para <strong>{membro.nome}</strong> e repasse-a pessoalmente.
      </p>
      <FormularioSenha acao={redefinirSenhaAction.bind(null, id)} />
    </>
  );
}
