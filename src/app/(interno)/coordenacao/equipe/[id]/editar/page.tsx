import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/modules/auth/dal";
import { obterMembro } from "@/modules/equipe/repositorio";
import { formatarTelefone } from "@/modules/equipe/domain/telefone";
import { editarMembroAction } from "@/modules/equipe/actions";
import { FormularioMembro } from "@/components/equipe/formulario-membro";

export const metadata: Metadata = {
  title: "Editar membro — Acutis Catequese",
};

export default async function EditarMembroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(["coordenacao"], `/coordenacao/equipe/${id}/editar`);
  const membro = await obterMembro(id);
  if (!membro) notFound();

  return (
    <>
      <p>
        <Link href={`/coordenacao/equipe/${id}`}>← Voltar para {membro.nome}</Link>
      </p>
      <h1>Editar membro</h1>
      <FormularioMembro
        modo="edicao"
        acao={editarMembroAction.bind(null, id)}
        valoresIniciais={{
          nome: membro.nome,
          email: membro.email,
          telefone: membro.telefone ? formatarTelefone(membro.telefone) : "",
          papel: membro.papel,
          observacoes: membro.observacoes ?? "",
        }}
      />
    </>
  );
}
