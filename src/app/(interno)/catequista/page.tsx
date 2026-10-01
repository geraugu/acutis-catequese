import type { Metadata } from "next";
import Link from "next/link";
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
      <p>
        <Link href="/catequista/turmas" className="botao botao-primario">
          Minhas turmas
        </Link>
      </p>
    </>
  );
}
