import type { Metadata } from "next";
import Link from "next/link";
import { getSessao } from "@/modules/auth/dal";
import { homeDoPapel } from "@/modules/auth/domain/papeis";

export const metadata: Metadata = {
  title: "Acesso negado — Acutis Catequese",
};

export default async function AcessoNegadoPage() {
  const sessao = await getSessao();
  return (
    <main className="container conteudo">
      <h1>Acesso negado</h1>
      <p>Você não tem permissão para acessar esta página.</p>
      {sessao ? (
        <Link href={homeDoPapel(sessao.papel)}>Voltar para a página inicial</Link>
      ) : (
        <Link href="/login">Ir para o login</Link>
      )}
    </main>
  );
}
