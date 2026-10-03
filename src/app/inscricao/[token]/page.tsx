import type { Metadata } from "next";
import { FormularioPublico } from "@/components/autocadastro/formulario-publico";
import { Marca } from "@/components/layout/marca";
import { hojeCivil } from "@/modules/compartilhado/datas";
import { enviarFichaAction } from "@/modules/autocadastro/actions-publicas";
import { situacaoDoLink } from "@/modules/autocadastro/domain/link";
import { MSG_INDISPONIVEL } from "@/modules/autocadastro/mensagens";
import { obterLinkPublico, type LinkPublico } from "@/modules/autocadastro/repositorio";
import { formatarHorario, ROTULO_DIA } from "@/modules/turmas/domain/turma";
import estilos from "./inscricao.module.css";

export const metadata: Metadata = {
  title: "Ficha de inscrição — Acutis Catequese",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** Tokens têm 43 caracteres base64url; qualquer outra coisa nem chega ao banco. */
async function linkAtivo(token: string): Promise<LinkPublico | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const link = await obterLinkPublico(token);
  if (!link || situacaoDoLink(link, link.turmaEncerrada, hojeCivil()) !== "ativo") return null;
  return link;
}

export default async function InscricaoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await linkAtivo(token);

  if (!link) {
    // Mesma página para qualquer motivo (2.2): não revela se o link existiu.
    return (
      <main className={`container ${estilos.pagina}`}>
        <Marca />
        <section className={estilos.cartao} aria-labelledby="inscricao-titulo">
          <h1 id="inscricao-titulo">Ficha de inscrição</h1>
          <p className={estilos.subtitulo}>{MSG_INDISPONIVEL}</p>
        </section>
      </main>
    );
  }

  const { turma } = link;
  return (
    <main className={`container ${estilos.pagina}`}>
      <Marca />
      <section className={estilos.cartao} aria-labelledby="inscricao-titulo">
        <h1 id="inscricao-titulo">Ficha de inscrição</h1>
        <p className={estilos.subtitulo}>
          Que alegria ter você na catequese! Preencha a ficha com calma.
        </p>
        <dl className={estilos.turma}>
          <dt>Turma</dt>
          <dd>{turma.nome}</dd>
          <dt>Dia</dt>
          <dd>{ROTULO_DIA[turma.diaSemana]}</dd>
          <dt>Horário</dt>
          <dd>{formatarHorario(turma.horario)}</dd>
          {turma.local ? (
            <>
              <dt>Local</dt>
              <dd>{turma.local}</dd>
            </>
          ) : null}
        </dl>
        <FormularioPublico acao={enviarFichaAction.bind(null, token)} />
      </section>
    </main>
  );
}
