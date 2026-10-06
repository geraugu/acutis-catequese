import Link from "next/link";

import type { Papel } from "@/app/(interno)/_turma/abas-config";

/** Link de volta à lista de turmas do papel e o nome da turma (1.1). */
export function CabecalhoTurma({ papel, nome }: { papel: Papel; nome: string }) {
  const coordenacao = papel === "coordenacao";
  return (
    <>
      <p>
        <Link href={coordenacao ? "/coordenacao/turmas" : "/catequista/turmas"}>
          {coordenacao ? "← Voltar para as turmas" : "← Voltar para minhas turmas"}
        </Link>
      </p>
      <div className="pagina-cabecalho">
        <h1>{nome}</h1>
      </div>
    </>
  );
}
