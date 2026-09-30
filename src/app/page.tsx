import { redirect } from "next/navigation";
import { getSessao } from "@/modules/auth/dal";
import { homeDoPapel } from "@/modules/auth/domain/papeis";

export default async function HomePage() {
  const sessao = await getSessao();
  redirect(sessao ? homeDoPapel(sessao.papel) : "/login");
}
