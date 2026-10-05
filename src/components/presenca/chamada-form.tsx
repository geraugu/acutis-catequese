"use client";

import { useActionState, useState } from "react";
import type { EstadoPresenca } from "@/modules/presenca/actions";
import type { LinhaChamada, ModoChamada } from "@/modules/presenca/domain/chamada";
import { STATUS_PRESENCA, type StatusPresenca } from "@/modules/presenca/domain/frequencia";
import { MSG_FALTAM_MARCACOES } from "@/modules/presenca/mensagens";
import { ROTULO_STATUS, StatusPresenca as SeloStatus } from "./status-presenca";

export type AcaoChamada = (anterior: EstadoPresenca, dados: FormData) => Promise<EstadoPresenca>;

/** Visitante do encontro, exibido só para leitura (4.9). */
export interface VisitanteDaChamada {
  catequizandoId: string;
  nome: string;
  turmaOrigemNome: string | null;
}

interface ChamadaFormProps {
  linhas: readonly LinhaChamada[];
  visitantes: readonly VisitanteDaChamada[];
  /** Ação já vinculada (`salvarChamadaAction.bind(null, turmaId, encontroId, base)`). */
  action: AcaoChamada;
  modo: ModoChamada;
  estadoInicial?: EstadoPresenca;
}

type Selecoes = Record<string, StatusPresenca | null>;

const MSG_FALTANTE = "Marque a presença deste catequizando.";

function ehStatus(valor: string | undefined): valor is StatusPresenca {
  return STATUS_PRESENCA.some((s) => s === valor);
}

function selecoesIniciais(
  linhas: readonly LinhaChamada[],
  valores: EstadoPresenca["valores"],
): Selecoes {
  const s: Selecoes = {};
  for (const l of linhas) {
    const v = valores?.[`status:${l.catequizandoId}`];
    s[l.catequizandoId] = ehStatus(v) ? v : l.status;
  }
  return s;
}

export function ChamadaForm({
  linhas,
  visitantes,
  action,
  modo,
  estadoInicial = {},
}: ChamadaFormProps) {
  const [estado, enviar, pendente] = useActionState(action, estadoInicial);
  const [selecoes, setSelecoes] = useState<Selecoes>(() =>
    selecoesIniciais(linhas, estadoInicial.valores),
  );
  const [estadoVisto, setEstadoVisto] = useState(estado);
  const [versao, setVersao] = useState(0);
  // Ao chegar uma resposta com marcações, reaplica-as: nada se perde após o erro (10.6).
  if (estado !== estadoVisto) {
    setEstadoVisto(estado);
    // O React reinicia o formulário após a ação: remonta os rádios para refletir as seleções.
    setVersao((v) => v + 1);
    if (estado.valores) setSelecoes(selecoesIniciais(linhas, estado.valores));
  }

  const faltantes = new Set(estado.faltantes ?? []);
  const totais: Record<StatusPresenca | "semMarcacao", number> = {
    presente: 0,
    ausente: 0,
    justificado: 0,
    semMarcacao: 0,
  };
  for (const l of linhas) {
    const s = selecoes[l.catequizandoId] ?? null;
    totais[s ?? "semMarcacao"] += 1;
  }

  function marcar(id: string, status: StatusPresenca) {
    setSelecoes((atual) => ({ ...atual, [id]: status }));
  }

  function marcarTodosPresentes() {
    setSelecoes(Object.fromEntries(linhas.map((l) => [l.catequizandoId, "presente" as const])));
  }

  return (
    <form action={enviar} noValidate className="formulario presenca-chamada">
      {estado.erro ? (
        <p role="alert" className="login-alerta">
          {estado.erro}
        </p>
      ) : faltantes.size > 0 ? (
        <p role="alert" className="login-alerta">
          {MSG_FALTAM_MARCACOES}
        </p>
      ) : null}

      <div className="presenca-barra">
        <button
          type="button"
          className="botao botao-secundario"
          onClick={marcarTodosPresentes}
          disabled={pendente || linhas.length === 0}
        >
          Marcar todos como presentes
        </button>
        <ul className="presenca-totais" aria-label="Totais da chamada">
          {STATUS_PRESENCA.map((s) => (
            <li key={s}>
              {ROTULO_STATUS[s]}s: <strong>{totais[s]}</strong>
            </li>
          ))}
          <li>
            Sem marcação: <strong>{totais.semMarcacao}</strong>
          </li>
        </ul>
      </div>

      <div key={versao} className="presenca-linhas">
        {linhas.map((l) => {
          const faltante = faltantes.has(l.catequizandoId) && selecoes[l.catequizandoId] === null;
          const idAviso = `presenca-faltante-${l.catequizandoId}`;
          return (
            <fieldset
              key={l.catequizandoId}
              className={`presenca-linha${faltante ? " presenca-linha-faltante" : ""}`}
              aria-describedby={faltante ? idAviso : undefined}
            >
              <legend className="presenca-nome">{l.nome}</legend>
              <div className="presenca-opcoes">
                {STATUS_PRESENCA.map((s) => (
                  <label key={s} className={`presenca-opcao presenca-opcao-${s}`}>
                    <input
                      type="radio"
                      name={`status:${l.catequizandoId}`}
                      value={s}
                      checked={selecoes[l.catequizandoId] === s}
                      onChange={() => marcar(l.catequizandoId, s)}
                    />
                    <SeloStatus status={s} />
                  </label>
                ))}
              </div>
              {faltante ? (
                <p id={idAviso} className="campo-erro presenca-faltante">
                  {MSG_FALTANTE}
                </p>
              ) : null}
            </fieldset>
          );
        })}
      </div>

      {visitantes.length > 0 ? (
        <section className="presenca-visitantes" aria-labelledby="presenca-visitantes-titulo">
          <h2 id="presenca-visitantes-titulo">Visitantes</h2>
          <ul className="presenca-lista-visitantes">
            {visitantes.map((v) => (
              <li key={v.catequizandoId}>
                <span>{v.nome}</span>
                <span className="presenca-selo-visitante">Visitante</span>
                {v.turmaOrigemNome ? (
                  <span className="presenca-origem">Turma de origem: {v.turmaOrigemNome}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <button type="submit" className="botao botao-primario" disabled={pendente}>
        {pendente ? "Salvando…" : modo === "nova" ? "Salvar chamada" : "Salvar alterações"}
      </button>
    </form>
  );
}
