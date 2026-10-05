interface SemTemaDoEncontroProps {
  tema: string;
  inscritos: readonly { catequizandoId: string; nome: string }[];
}

/** Inscritos que ainda não cumpriram o tema do encontro (8.5). */
export function SemTemaDoEncontro({ tema, inscritos }: SemTemaDoEncontroProps) {
  return (
    <section aria-label={`Quem ainda não viu o tema ${tema}`}>
      <h2>Ainda não viram: {tema}</h2>
      {inscritos.length === 0 ? (
        <p className="presenca-origem">Todos os inscritos já cumpriram este tema.</p>
      ) : (
        <ul className="presenca-lista-visitantes">
          {inscritos.map((i) => (
            <li key={i.catequizandoId}>{i.nome}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
