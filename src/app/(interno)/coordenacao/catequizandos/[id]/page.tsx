import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/modules/auth/dal";
import { obterCatequizando } from "@/modules/catequizandos/repositorio";
import { ROTULO_ESTADO } from "@/modules/catequizandos/domain/estado";
import { ROTULO_SACRAMENTO, SACRAMENTOS } from "@/modules/catequizandos/domain/ficha";
import { calcularIdade, formatarData, hojeCivil } from "@/modules/compartilhado/datas";
import { formatarTelefone, linkLigacao, linkWhatsApp } from "@/modules/compartilhado/telefone";
import {
  confirmarFichaAction,
  inativarCatequizandoAction,
  reativarCatequizandoAction,
  recusarFichaAction,
} from "@/modules/catequizandos/actions";
import { Aviso } from "@/components/comum/aviso";
import { mensagemDeAviso } from "@/modules/catequizandos/mensagens";
import { AcoesEstado } from "@/components/catequizandos/acoes-estado";

export const metadata: Metadata = {
  title: "Catequizando — Acutis Catequese",
};

type Busca = Record<string, string | string[] | undefined>;

export default async function CatequizandoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Busca>;
}) {
  const { id } = await params;
  await requireRole(["coordenacao"], `/coordenacao/catequizandos/${id}`);
  const busca = await searchParams;
  const catequizando = await obterCatequizando(id);
  if (!catequizando) notFound();

  const aviso = Array.isArray(busca.aviso) ? busca.aviso[0] : busca.aviso;
  const idade = calcularIdade(catequizando.dataNascimento, hojeCivil());

  return (
    <>
      <p>
        <Link href="/coordenacao/catequizandos">← Voltar para os catequizandos</Link>
      </p>
      <div className="pagina-cabecalho">
        <h1>{catequizando.nome}</h1>
      </div>
      <Aviso mensagem={mensagemDeAviso(aviso)} />
      <dl className="membro-dados">
        <div>
          <dt>Data de nascimento</dt>
          <dd>
            {formatarData(catequizando.dataNascimento)} ({idade} {idade === 1 ? "ano" : "anos"})
          </dd>
        </div>
        <div>
          <dt>Telefone</dt>
          <dd>
            {formatarTelefone(catequizando.telefone)}
            <span className="membro-contato">
              <a href={linkLigacao(catequizando.telefone)}>Ligar</a>
              <a
                href={linkWhatsApp(catequizando.telefone)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp (abre em nova aba)"
              >
                WhatsApp
              </a>
            </span>
          </dd>
        </div>
        <div>
          <dt>E-mail</dt>
          <dd>{catequizando.email || "Não informado"}</dd>
        </div>
        <div>
          <dt>Endereço</dt>
          <dd className="membro-observacoes">{catequizando.endereco || "Não informado"}</dd>
        </div>
        {SACRAMENTOS.map((s) => {
          const sacramento = catequizando.sacramentos[s];
          const detalhes = [
            sacramento.data ? `em ${formatarData(sacramento.data)}` : null,
            sacramento.paroquia ? `na paróquia ${sacramento.paroquia}` : null,
          ].filter(Boolean);
          return (
            <div key={s}>
              <dt>{ROTULO_SACRAMENTO[s]}</dt>
              <dd>
                {sacramento.recebido ? "Recebido" : "Não recebido"}
                {sacramento.recebido && detalhes.length > 0 ? (
                  <span className="catequizando-sacramento-detalhe"> {detalhes.join(", ")}</span>
                ) : null}
              </dd>
            </div>
          );
        })}
        <div>
          <dt>Observações</dt>
          <dd className="membro-observacoes">{catequizando.observacoes || "Nenhuma"}</dd>
        </div>
        <div>
          <dt>Situação</dt>
          <dd>
            <span className={`situacao estado-${catequizando.estado}`}>
              {ROTULO_ESTADO[catequizando.estado]}
            </span>
          </dd>
        </div>
        <div>
          <dt>Cadastrado em</dt>
          <dd>
            {catequizando.criadoEm.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
          </dd>
        </div>
      </dl>
      <div className="membro-acoes">
        <Link href={`/coordenacao/catequizandos/${id}/editar`} className="botao botao-secundario">
          Editar
        </Link>
      </div>
      <AcoesEstado
        nome={catequizando.nome}
        estado={catequizando.estado}
        inativar={inativarCatequizandoAction.bind(null, id)}
        reativar={reativarCatequizandoAction.bind(null, id)}
        confirmar={confirmarFichaAction.bind(null, id)}
        recusar={recusarFichaAction.bind(null, id)}
      />
    </>
  );
}
