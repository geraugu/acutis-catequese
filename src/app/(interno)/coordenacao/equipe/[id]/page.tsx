import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/modules/auth/dal";
import { ROTULO_PAPEL } from "@/modules/auth/domain/papeis";
import { obterMembro } from "@/modules/equipe/repositorio";
import { formatarTelefone, linkLigacao, linkWhatsApp } from "@/modules/compartilhado/telefone";
import { inativarMembroAction, reativarMembroAction } from "@/modules/equipe/actions";
import { Aviso } from "@/components/equipe/aviso";
import { AcoesSituacao } from "@/components/equipe/acoes-situacao";

export const metadata: Metadata = {
  title: "Membro da equipe — Acutis Catequese",
};

type Busca = Record<string, string | string[] | undefined>;

const ROTULO_SITUACAO = { ativo: "Ativo", inativo: "Inativo" } as const;

export default async function MembroPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Busca>;
}) {
  const { id } = await params;
  await requireRole(["coordenacao"], `/coordenacao/equipe/${id}`);
  const busca = await searchParams;
  const membro = await obterMembro(id);
  if (!membro) notFound();

  const aviso = Array.isArray(busca.aviso) ? busca.aviso[0] : busca.aviso;

  return (
    <>
      <p>
        <Link href="/coordenacao/equipe">← Voltar para a equipe</Link>
      </p>
      <div className="pagina-cabecalho">
        <h1>{membro.nome}</h1>
      </div>
      <Aviso codigo={aviso} />
      <dl className="membro-dados">
        <div>
          <dt>Papel</dt>
          <dd>{ROTULO_PAPEL[membro.papel]}</dd>
        </div>
        <div>
          <dt>E-mail</dt>
          <dd>{membro.email}</dd>
        </div>
        <div>
          <dt>Telefone</dt>
          <dd>
            {membro.telefone ? (
              <>
                {formatarTelefone(membro.telefone)}
                <span className="membro-contato">
                  <a href={linkLigacao(membro.telefone)}>Ligar</a>
                  <a
                    href={linkWhatsApp(membro.telefone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp (abre em nova aba)"
                  >
                    WhatsApp
                  </a>
                </span>
              </>
            ) : (
              "Não informado"
            )}
          </dd>
        </div>
        <div>
          <dt>Observações</dt>
          <dd className="membro-observacoes">{membro.observacoes || "Nenhuma"}</dd>
        </div>
        <div>
          <dt>Situação</dt>
          <dd>
            <span className={`situacao situacao-${membro.situacao}`}>
              {ROTULO_SITUACAO[membro.situacao]}
            </span>
          </dd>
        </div>
        <div>
          <dt>Cadastrado em</dt>
          <dd>{membro.criadoEm.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</dd>
        </div>
      </dl>
      <div className="membro-acoes">
        <Link href={`/coordenacao/equipe/${id}/editar`} className="botao botao-secundario">
          Editar
        </Link>
        <Link href={`/coordenacao/equipe/${id}/senha`} className="botao botao-secundario">
          Redefinir senha
        </Link>
      </div>
      <AcoesSituacao
        nome={membro.nome}
        situacao={membro.situacao}
        inativar={inativarMembroAction.bind(null, id)}
        reativar={reativarMembroAction.bind(null, id)}
      />
    </>
  );
}
