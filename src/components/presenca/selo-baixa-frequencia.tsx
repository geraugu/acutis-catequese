/** Selo "Baixa frequência" com ícone e texto, sem depender só da cor (7.9). */
export function SeloBaixaFrequencia() {
  return (
    <span className="presenca-selo-baixa">
      <svg
        className="presenca-icone"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3 2 21h20L12 3Z" />
        <path d="M12 10v5M12 18v.01" />
      </svg>
      <span>Baixa frequência</span>
    </span>
  );
}
