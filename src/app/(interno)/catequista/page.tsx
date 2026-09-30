import type { Metadata } from "next";
import { requireRole } from "@/modules/auth/dal";

export const metadata: Metadata = {
  title: "Catequista — Acutis Catequese",
};

export default async function CatequistaPage() {
  // A coordenação também passa nesta exigência (hierarquia de papéis, 6.5).
  const sessao = await requireRole(["catequista"], "/catequista");
  return (
    <>
      <h1>Olá, {sessao.nome}</h1>
      <p>Bem-vindo(a) à área do catequista. Por aqui você acompanhará suas turmas e encontros.</p>
    </>
  );
}
