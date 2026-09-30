import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Membro não encontrado — Acutis Catequese",
};

export default function MembroNaoEncontrado() {
  return (
    <>
      <h1>Membro não encontrado</h1>
      <p>Este membro não existe ou o endereço está incorreto.</p>
      <p>
        <Link href="/coordenacao/equipe">Voltar para a lista da equipe</Link>
      </p>
    </>
  );
}
