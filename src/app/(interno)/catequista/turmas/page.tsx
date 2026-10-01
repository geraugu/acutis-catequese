import type { Metadata } from "next";
import { requireRole } from "@/modules/auth/dal";
import { listarTurmasDoCatequista } from "@/modules/turmas/repositorio";
import { ListaTurmas } from "@/components/turmas/lista-turmas";

export const metadata: Metadata = {
  title: "Minhas turmas — Acutis Catequese",
};

export default async function MinhasTurmasPage() {
  const sessao = await requireRole(["catequista"], "/catequista/turmas");
  const turmas = await listarTurmasDoCatequista(sessao.userId);

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Minhas turmas</h1>
      </div>
      {turmas.length === 0 ? (
        <div className="lista-vazia">
          <p>Você ainda não tem turmas designadas.</p>
        </div>
      ) : (
        <ListaTurmas turmas={turmas} base="/catequista/turmas" />
      )}
    </>
  );
}
