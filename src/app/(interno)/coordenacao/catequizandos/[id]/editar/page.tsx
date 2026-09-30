import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/modules/auth/dal";
import { obterCatequizando } from "@/modules/catequizandos/repositorio";
import { formatarTelefone } from "@/modules/compartilhado/telefone";
import { editarCatequizandoAction } from "@/modules/catequizandos/actions";
import { SACRAMENTOS } from "@/modules/catequizandos/domain/ficha";
import { FormularioFicha } from "@/components/catequizandos/formulario-ficha";

export const metadata: Metadata = {
  title: "Editar catequizando — Acutis Catequese",
};

export default async function EditarCatequizandoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole(["coordenacao"], `/coordenacao/catequizandos/${id}/editar`);
  const catequizando = await obterCatequizando(id);
  if (!catequizando) notFound();

  // Campos planos no formato do formulário (checkbox marcado = "on").
  const valores: Record<string, string> = {
    nome: catequizando.nome,
    dataNascimento: catequizando.dataNascimento,
    telefone: formatarTelefone(catequizando.telefone),
    email: catequizando.email ?? "",
    endereco: catequizando.endereco ?? "",
    observacoes: catequizando.observacoes ?? "",
  };
  for (const s of SACRAMENTOS) {
    const sacramento = catequizando.sacramentos[s];
    if (sacramento.recebido) valores[`${s}Recebido`] = "on";
    valores[`${s}Data`] = sacramento.data ?? "";
    valores[`${s}Paroquia`] = sacramento.paroquia ?? "";
  }

  return (
    <>
      <p>
        <Link href={`/coordenacao/catequizandos/${id}`}>← Voltar para {catequizando.nome}</Link>
      </p>
      <h1>Editar catequizando</h1>
      <FormularioFicha
        modo="edicao"
        acao={editarCatequizandoAction.bind(null, id)}
        valoresIniciais={valores}
      />
    </>
  );
}
