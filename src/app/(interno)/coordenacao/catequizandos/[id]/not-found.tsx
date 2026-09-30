import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Catequizando não encontrado — Acutis Catequese",
};

export default function CatequizandoNaoEncontrado() {
  return (
    <>
      <h1>Catequizando não encontrado</h1>
      <p>Este catequizando não existe ou o endereço está incorreto.</p>
      <p>
        <Link href="/coordenacao/catequizandos">Voltar para a lista de catequizandos</Link>
      </p>
    </>
  );
}
