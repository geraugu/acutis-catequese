"use client";

import { Confirmacao } from "@/components/comum/confirmacao";
import type { EstadoFicha } from "@/modules/catequizandos/actions";
import {
  operacoesDisponiveis,
  type EstadoCatequizando,
  type Operacao,
} from "@/modules/catequizandos/domain/estado";

/** Action de estado já vinculada ao id do catequizando (via bind). */
export type AcaoEstado = (anterior: EstadoFicha) => Promise<EstadoFicha>;

interface AcoesEstadoProps {
  nome: string;
  estado: EstadoCatequizando;
  inativar: AcaoEstado;
  reativar: AcaoEstado;
  confirmar: AcaoEstado;
  recusar: AcaoEstado;
}

const TEXTOS: Record<
  Operacao,
  { abrir: string; titulo: (nome: string) => string; efeito: string; perigo: boolean }
> = {
  inativar: {
    abrir: "Inativar",
    titulo: (nome) => `Inativar ${nome}?`,
    efeito:
      "O catequizando sai da lista de ativos. Os dados são mantidos e ele pode ser reativado depois.",
    perigo: true,
  },
  reativar: {
    abrir: "Reativar",
    titulo: (nome) => `Reativar ${nome}?`,
    efeito: "O catequizando volta para a lista de ativos com os mesmos dados.",
    perigo: false,
  },
  confirmar: {
    abrir: "Confirmar ficha",
    titulo: (nome) => `Confirmar a ficha de ${nome}?`,
    efeito: "A ficha passa a ativa e o catequizando entra na lista de ativos.",
    perigo: false,
  },
  recusar: {
    abrir: "Recusar ficha",
    titulo: (nome) => `Recusar a ficha de ${nome}?`,
    efeito: "A ficha fica inativa; ela não é excluída e pode ser reativada depois.",
    perigo: true,
  },
};

/** Operações de estado disponíveis, cada uma com confirmação nomeada (6.5, 7.3, 8.3). */
export function AcoesEstado({ nome, estado, ...acoes }: AcoesEstadoProps) {
  return (
    <>
      {operacoesDisponiveis(estado).map((op) => {
        const t = TEXTOS[op];
        return (
          <Confirmacao
            key={op}
            rotuloAbrir={t.abrir}
            titulo={t.titulo(nome)}
            texto={t.efeito}
            rotuloConfirmar={t.abrir}
            perigo={t.perigo}
            acao={acoes[op]}
          />
        );
      })}
    </>
  );
}
