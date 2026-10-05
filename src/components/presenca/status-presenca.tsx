import { type StatusPresenca } from "@/modules/presenca/domain/frequencia";

export const ROTULO_STATUS: Record<StatusPresenca, string> = {
  presente: "Presente",
  ausente: "Ausente",
  justificado: "Justificado",
};

/** Ícone simples por status (aria-hidden): o texto sempre acompanha, nunca só a cor (10.4). */
function Icone({ status }: { status: StatusPresenca }) {
  return (
    <svg
      className="presenca-icone"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {status === "presente" ? <path d="M3 8.5l3.5 3.5L13 4.5" /> : null}
      {status === "ausente" ? <path d="M4 4l8 8M12 4l-8 8" /> : null}
      {status === "justificado" ? <path d="M3 8h10M8 3v10" /> : null}
    </svg>
  );
}

/** Status de presença com ícone e rótulo (10.4). */
export function StatusPresenca({ status }: { status: StatusPresenca }) {
  return (
    <span className={`presenca-status presenca-status-${status}`}>
      <Icone status={status} />
      <span>{ROTULO_STATUS[status]}</span>
    </span>
  );
}
