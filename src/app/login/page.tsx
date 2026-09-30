import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { Marca } from "@/components/layout/marca";
import { getSessao } from "@/modules/auth/dal";
import { homeDoPapel } from "@/modules/auth/domain/papeis";

export const metadata: Metadata = {
  title: "Entrar — Acutis Catequese",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sessao = await getSessao();
  if (sessao) redirect(homeDoPapel(sessao.papel));

  const { callbackUrl } = await searchParams;
  const callback = typeof callbackUrl === "string" ? callbackUrl : undefined;

  return (
    <main className="container login-pagina">
      <Marca />
      <section className="login-cartao" aria-labelledby="login-titulo">
        <h1 id="login-titulo">Entrar</h1>
        <p className="login-subtitulo">Que bom ver você. Entre para acompanhar a catequese.</p>
        <LoginForm callbackUrl={callback} />
      </section>
    </main>
  );
}
