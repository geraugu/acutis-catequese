/**
 * Prepara, direto no banco de teste, três turmas com presenças em encontros realizados no passado:
 * T1 (do catequista de teste) com A 3/3, B 1/2 e C 0/2; T2 (sem o catequista) com D 0/2; T3
 * encerrada com E 0/2. Imprime os ids e nomes em JSON. Roda via `tsx` (como o criar-chamada.ts)
 * porque o client do Prisma é ESM.
 * Uso: tsx tests/e2e/criar-frequencia.ts "<sufixo>"
 */
import { prisma } from "@/lib/prisma";
import { CATEQUISTA } from "./fixtures";

const dia = (d: string): Date => new Date(`${d}T00:00:00Z`);
type Status = "presente" | "ausente";

async function criarTurma(nome: string, encerrada: boolean) {
  return prisma.turma.create({
    data: {
      nome,
      ciclo: 2026,
      diaSemana: "sabado",
      horario: "09:30",
      encerradaEm: encerrada ? dia("2026-06-30") : null,
    },
    select: { id: true, nome: true },
  });
}

/** Cria um encontro realizado em cada data, com o tema dado. */
async function criarEncontros(turmaId: string, temaId: string, datas: string[]) {
  const ids: string[] = [];
  for (const data of datas) {
    const e = await prisma.encontro.create({
      data: { turmaId, temaId, data: dia(data), horario: "09:30", situacao: "realizado" },
      select: { id: true },
    });
    ids.push(e.id);
  }
  return ids;
}

/** Cria o catequizando inscrito na turma e suas presenças (uma por encontro, na ordem). */
async function criarCatequizando(
  nome: string,
  turmaId: string,
  encontros: string[],
  status: Status[],
  encerrada: boolean,
) {
  const c = await prisma.catequizando.create({
    data: { nome, dataNascimento: dia("2015-03-10"), telefone: "11999990000" },
    select: { id: true },
  });
  await prisma.inscricao.create({
    data: {
      turmaId,
      catequizandoId: c.id,
      dataEntrada: dia("2026-01-05"),
      // Como o app encerra a turma: a inscrição vigente recebe saída por encerramento.
      ...(encerrada ? { dataSaida: dia("2026-06-30"), motivoSaida: "encerramento" as const } : {}),
    },
  });
  for (const [i, s] of status.entries()) {
    await prisma.presenca.create({
      data: { encontroId: encontros[i], turmaId, catequizandoId: c.id, status: s },
    });
  }
  return { id: c.id, nome };
}

async function main() {
  if (!/acutis_test/.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("O e2e só roda contra o banco acutis_test.");
  }
  const sufixo = process.argv[2];
  if (!sufixo) throw new Error("Informe o sufixo.");
  const catequista = await prisma.user.findUniqueOrThrow({
    where: { email: CATEQUISTA.email },
    select: { id: true },
  });
  const { _min } = await prisma.tema.aggregate({ _min: { posicao: true } });
  const posicaoAbaixoDoMenor = (_min.posicao ?? 0) - 1 - Math.floor(Math.random() * 10);
  const tema = await prisma.tema.create({
    data: {
      titulo: `Tema Frequência ${sufixo}`,
      chave: `tema frequencia ${sufixo}`.toLowerCase(),
      // Sempre abaixo do menor existente: nunca se interpõe entre os temas que a UI cria com max+1.
      posicao: posicaoAbaixoDoMenor,
    },
    select: { id: true },
  });
  const datas = ["2026-02-07", "2026-02-14", "2026-02-21"];

  const t1 = await criarTurma(`Turma Frequência Um ${sufixo}`, false);
  await prisma.designacao.create({ data: { turmaId: t1.id, userId: catequista.id } });
  const e1 = await criarEncontros(t1.id, tema.id, datas);
  const a = await criarCatequizando(
    `Alerta Alfa ${sufixo}`,
    t1.id,
    e1,
    ["presente", "presente", "presente"],
    false,
  );
  const b = await criarCatequizando(
    `Alerta Beta ${sufixo}`,
    t1.id,
    e1,
    ["presente", "ausente"],
    false,
  );
  const c = await criarCatequizando(
    `Alerta Gama ${sufixo}`,
    t1.id,
    e1,
    ["ausente", "ausente"],
    false,
  );

  const t2 = await criarTurma(`Turma Frequência Dois ${sufixo}`, false);
  const e2 = await criarEncontros(t2.id, tema.id, datas.slice(0, 2));
  const d = await criarCatequizando(
    `Alerta Delta ${sufixo}`,
    t2.id,
    e2,
    ["ausente", "ausente"],
    false,
  );

  const t3 = await criarTurma(`Turma Frequência Encerrada ${sufixo}`, true);
  const e3 = await criarEncontros(t3.id, tema.id, datas.slice(0, 2));
  const e = await criarCatequizando(
    `Alerta Epsilon ${sufixo}`,
    t3.id,
    e3,
    ["ausente", "ausente"],
    true,
  );

  process.stdout.write(
    JSON.stringify({
      t1: { id: t1.id, nome: t1.nome },
      t2: { id: t2.id, nome: t2.nome, encontroId: e2[0] },
      t3: { id: t3.id, nome: t3.nome, encontroId: e3[0] },
      a: a.nome,
      b: b.nome,
      c: c.nome,
      d: d.nome,
      e: e.nome,
    }),
  );
}

main()
  .finally(() => prisma.$disconnect())
  .catch((erro: unknown) => {
    console.error(erro);
    process.exit(1);
  });
