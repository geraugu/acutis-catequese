import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tema não encontrado — Acutis Catequese",
};

export default function TemaNaoEncontrado() {
  return (
    <>
      <h1>Tema não encontrado</h1>
      <p>Este tema não existe ou o endereço está incorreto.</p>
      <p>
        <Link href="/coordenacao/programa">Voltar para o programa</Link>
      </p>
    </>
  );
}
