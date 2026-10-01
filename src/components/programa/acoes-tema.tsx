"use client";

import { useActionState } from "react";
import { Confirmacao } from "@/components/comum/confirmacao";
import type { EstadoPrograma } from "@/modules/programa/actions";

/** Action de tema já vinculada ao id via bind (useActionState). */
export type AcaoTema = (anterior: EstadoPrograma) => Promise<EstadoPrograma>;

interface AcoesTemaProps {
  tema: { id: string; titulo: string; ativo: boolean; encontros: number };
  desativar: AcaoTema;
  reativar: AcaoTema;
  excluir: AcaoTema;
}

function Reativar({ titulo, acao }: { titulo: string; acao: AcaoTema }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form action={enviar}>
      {estado.erro ? (
        <p role="alert" className="login-alerta">
          {estado.erro}
        </p>
      ) : null}
      <button type="submit" className="botao" disabled={pendente}>
        Reativar <span className="visualmente-oculto">{titulo}</span>
      </button>
    </form>
  );
}

/** Desativar/Reativar e Excluir (só sem encontros) de um tema (3.1–3.5). */
export function AcoesTema({ tema, desativar, reativar, excluir }: AcoesTemaProps) {
  return (
    <div className="acoes-tema">
      {tema.ativo ? (
        <Confirmacao
          rotuloAbrir={`Desativar ${tema.titulo}`}
          titulo={`Desativar o tema ${tema.titulo}?`}
          texto="O tema deixa de aparecer na escolha de novos encontros; o histórico é preservado."
          rotuloConfirmar="Desativar"
          perigo
          acao={desativar}
        />
      ) : (
        <Reativar titulo={tema.titulo} acao={reativar} />
      )}
      {tema.encontros === 0 && (
        <Confirmacao
          rotuloAbrir={`Excluir ${tema.titulo}`}
          titulo={`Excluir o tema ${tema.titulo}?`}
          texto="O tema é removido definitivamente do programa."
          rotuloConfirmar="Excluir"
          perigo
          acao={excluir}
        />
      )}
    </div>
  );
}
