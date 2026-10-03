"use client";

import { useState } from "react";

type Resultado = "copiado" | "falhou" | null;

/** Copia o link pela Clipboard API; sem ela, orienta a copiar manualmente (1.2). */
export function CopiarLink({ url }: { url: string }) {
  const [resultado, setResultado] = useState<Resultado>(null);

  async function copiar() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("sem clipboard");
      await navigator.clipboard.writeText(url);
      setResultado("copiado");
    } catch {
      setResultado("falhou");
    }
  }

  return (
    <>
      <button type="button" className="botao botao-secundario" onClick={copiar}>
        Copiar link
      </button>
      <span role="status">
        {resultado === "copiado"
          ? "Link copiado"
          : resultado === "falhou"
            ? "Não foi possível copiar. Selecione o link e copie manualmente."
            : null}
      </span>
    </>
  );
}
