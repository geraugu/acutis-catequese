import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
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
    <main className="login-pagina">
      <h1>Entrar</h1>
      <LoginForm callbackUrl={callback} />
    </main>
  );
}
