import Link from "next/link";

import { SeloBaixaFrequencia } from "@/components/presenca/selo-baixa-frequencia";
import { plural } from "@/components/presenca/resumo-chamada";
import { calcularFrequencia, type ContagemFrequencia } from "@/modules/presenca/domain/frequencia";

export interface AlertaDeFrequencia {
  catequizandoId: string;
  nome: string;
  turmaId: string;
  turmaNome: string;
  contagem: ContagemFrequencia;
  href?: string;
}

interface AlertasFrequenciaProps {
  /** Já ordenados pelo menor percentual primeiro. */
  alertas: AlertaDeFrequencia[];
  limite: number;
}

function textoContagens(c: ContagemFrequencia): string {
  return [
    plural(c.presentes, "presente", "presentes"),
    plural(c.ausentes, "ausente", "ausentes"),
    plural(c.justificados, "justificado", "justificados"),
  ].join(" · ");
}

/** Catequizandos em baixa frequência e o limite em vigor (7.2, 7.3, 7.8, 7.9, 7.10). */
export function AlertasFrequencia({ alertas, limite }: AlertasFrequenciaProps) {
  return (
    <div>
      <p className="presenca-contagens">Limite de frequência: {limite}%</p>
      {alertas.length === 0 ? (
        <p>Nenhum catequizando em baixa frequência. Tudo em dia!</p>
      ) : (
        <ul className="presenca-inscritos">
          {alertas.map((a) => {
            const { percentual } = calcularFrequencia(a.contagem);
            return (
              <li key={a.catequizandoId} className="presenca-inscrito">
                <span className="presenca-inscrito-nome">
                  {a.href ? <Link href={a.href}>{a.nome}</Link> : a.nome}
                </span>
                <span className="presenca-contagens">{a.turmaNome}</span>
                <span className="presenca-percentual">
                  {percentual === null ? "Sem encontros registrados" : `${percentual}%`}
                </span>
                <span className="presenca-contagens">{textoContagens(a.contagem)}</span>
                <SeloBaixaFrequencia />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
