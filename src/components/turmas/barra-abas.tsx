"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { ABAS } from "@/app/(interno)/_turma/abas-config";

/** Navegação entre as abas da turma; a atual leva `aria-current` e destaque em texto (1.2, 1.4, 1.6). */
export function BarraAbas({ base, pendentes }: { base: string; pendentes: number }) {
  const atual = useSelectedLayoutSegment();

  return (
    <nav aria-label="Seções da turma" className="abas-turma">
      <ul className="abas-turma-lista">
        {ABAS.map((aba) => {
          const href = aba.segmento === null ? base : `${base}/${aba.segmento}`;
          const ativa = aba.segmento === atual;
          const comContagem = aba.segmento === "equipe" && pendentes > 0;
          return (
            <li key={aba.rotulo}>
              <Link href={href} className="aba-turma" aria-current={ativa ? "page" : undefined}>
                {aba.rotulo}
                {comContagem ? (
                  <>
                    <span className="aba-contagem" aria-hidden="true">
                      {pendentes}
                    </span>
                    <span className="visualmente-oculto">
                      {pendentes === 1 ? "1 ficha pendente" : `${pendentes} fichas pendentes`}
                    </span>
                  </>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
