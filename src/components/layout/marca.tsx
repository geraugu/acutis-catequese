/** Marca do sistema: ícone de folha (design "Acolhedor") e nome. */
export function Marca() {
  return (
    <span className="marca">
      <span className="marca-icone" aria-hidden="true">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 21c.5 -4.5 2.5 -8 7 -10" />
          <path d="M9 18c6.218 0 10.5 -3.288 11 -12v-2h-4.014c-9 0 -11.986 4 -12 9c0 1 0 3 2 5h3z" />
        </svg>
      </span>
      Acutis Catequese
    </span>
  );
}
