import Link from "next/link";

import { plural } from "@/components/presenca/resumo-chamada";
import {
  calcularFrequencia,
  emAlerta,
  ordenarPorFrequencia,
  somarContagens,
  type ContagemFrequencia,
  type Frequencia,
} from "@/modules/presenca/domain/frequencia";

export type OrdemFrequencia = "nome" | "frequencia";

export interface ItemFrequenciaTurma {
  catequizandoId: string;
  nome: string;
  contagem: ContagemFrequencia;
  href?: string;
}

interface FrequenciaTurmaProps {
  itens: ItemFrequenciaTurma[];
  limite: number;
  ordem: OrdemFrequencia;
  hrefOrdenar: (ordem: OrdemFrequencia) => string;
}

function textoPercentual(frequencia: Frequencia): string {
  return frequencia.percentual === null ? "Sem encontros registrados" : `${frequencia.percentual}%`;
}

function textoContagens(c: ContagemFrequencia): string {
  return [
    plural(c.presentes, "presente", "presentes"),
    plural(c.ausentes, "ausente", "ausentes"),
    plural(c.justificados, "justificado", "justificados"),
  ].join(" · ");
}

function IconeAlerta() {
  return (
    <svg
      className="presenca-icone"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 10v5M12 18v.01" />
    </svg>
  );
}

/** Frequência da turma: percentual, alertas e inscritos ordenáveis (5.4, 5.5, 6.2, 6.4, 6.5, 7.4, 7.9). */
export function FrequenciaTurma({ itens, limite, ordem, hrefOrdenar }: FrequenciaTurmaProps) {
  const turma = calcularFrequencia(somarContagens(itens.map((i) => i.contagem)));
  const emBaixa = itens.filter((i) => emAlerta(i.contagem, limite)).length;

  const comFrequencia = itens.map((i) => ({ ...i, frequencia: calcularFrequencia(i.contagem) }));
  const ordenados =
    ordem === "frequencia"
      ? ordenarPorFrequencia(comFrequencia)
      : [...comFrequencia].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div>
      <p className="presenca-frequencia">
        <span className="presenca-percentual">{textoPercentual(turma)}</span>
        <span className="presenca-contagens">{emBaixa} em baixa frequência</span>
      </p>

      {ordenados.length === 0 ? (
        <p>Nenhum catequizando inscrito.</p>
      ) : (
        <>
          <nav aria-label="Ordenação dos inscritos" className="presenca-frequencia">
            {(
              [
                ["nome", "Ordenar por nome"],
                ["frequencia", "Ordenar por menor frequência"],
              ] as const
            ).map(([valor, rotulo]) => (
              <Link
                key={valor}
                href={hrefOrdenar(valor)}
                aria-current={ordem === valor ? "true" : undefined}
              >
                {rotulo}
              </Link>
            ))}
          </nav>
          <ul className="presenca-inscritos">
            {ordenados.map((item) => (
              <li key={item.catequizandoId} className="presenca-inscrito">
                <span className="presenca-inscrito-nome">
                  {item.href ? <Link href={item.href}>{item.nome}</Link> : item.nome}
                </span>
                <span className="presenca-percentual">{textoPercentual(item.frequencia)}</span>
                <span className="presenca-contagens">{textoContagens(item.contagem)}</span>
                {emAlerta(item.contagem, limite) ? (
                  <span className="presenca-selo-baixa">
                    <IconeAlerta />
                    <span>Baixa frequência</span>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
