import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Turma não encontrada — Acutis Catequese",
};

export default function TurmaNaoEncontrada() {
  return (
    <>
      <h1>Turma não encontrada</h1>
      <p>Esta turma não existe ou o endereço está incorreto.</p>
      <p>
        <Link href="/coordenacao/turmas">Voltar para a lista de turmas</Link>
      </p>
    </>
  );
}
