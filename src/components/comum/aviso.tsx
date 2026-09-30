/** Mensagem de sucesso (role=status); nada quando a mensagem é nula. */
export function Aviso({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null;
  return (
    <p role="status" className="aviso">
      {mensagem}
    </p>
  );
}
