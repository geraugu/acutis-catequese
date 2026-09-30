import type { Metadata } from "next";
import { requireRole } from "@/modules/auth/dal";

export const metadata: Metadata = {
  title: "Coordenação — Acutis Catequese",
};

export default async function CoordenacaoPage() {
  const sessao = await requireRole(["coordenacao"], "/coordenacao");
  return (
    <>
      <h1>Olá, {sessao.nome}</h1>
      <p>
        Bem-vindo(a) à área da coordenação. Por aqui você acompanhará turmas, catequistas e
        catequizandos da paróquia.
      </p>
    </>
  );
}
