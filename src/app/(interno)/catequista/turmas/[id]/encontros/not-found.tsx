import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Não encontrado — Acutis Catequese",
};

export default function EncontrosNaoEncontrado() {
  return (
    <>
      <h1>Não encontrado</h1>
      <p>Esta turma ou encontro não existe, ou o endereço está incorreto.</p>
      <p>
        <Link href="/catequista/turmas">Voltar para a lista de turmas</Link>
      </p>
    </>
  );
}
