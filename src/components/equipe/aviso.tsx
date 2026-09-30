import { mensagemDeAviso } from "@/modules/equipe/mensagens";

/** Mensagem de sucesso a partir do `?aviso=`; só códigos conhecidos geram texto. */
export function Aviso({ codigo }: { codigo: unknown }) {
  const mensagem = mensagemDeAviso(codigo);
  if (!mensagem) return null;
  return (
    <p role="status" className="aviso">
      {mensagem}
    </p>
  );
}
