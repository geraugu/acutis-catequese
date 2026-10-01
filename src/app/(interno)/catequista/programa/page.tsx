import type { Metadata } from "next";
import { requireRole } from "@/modules/auth/dal";
import { listarTemas } from "@/modules/programa/repositorio";
import { numerarTemas } from "@/modules/programa/domain/tema";
import { ListaTemas } from "@/components/programa/lista-temas";

export const metadata: Metadata = {
  title: "Programa — Acutis Catequese",
};

/** Consulta do programa pelo catequista: sem links nem ações (1.2). */
export default async function ProgramaCatequistaPage() {
  await requireRole(["catequista"], "/catequista/programa");
  const temas = numerarTemas(await listarTemas());

  return (
    <>
      <div className="pagina-cabecalho">
        <h1>Programa</h1>
      </div>
      {temas.length === 0 ? (
        <div className="lista-vazia">
          <p>O programa ainda não tem temas.</p>
        </div>
      ) : (
        <ListaTemas temas={temas} />
      )}
    </>
  );
}
