import { sairAction } from "@/modules/auth/actions";

export function SairButton() {
  return (
    <form action={sairAction} className="sair-form">
      <button type="submit" className="botao botao-secundario">
        Sair
      </button>
    </form>
  );
}
