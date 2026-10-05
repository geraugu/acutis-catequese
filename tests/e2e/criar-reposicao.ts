/**
 * Prepara, direto no banco de teste, duas turmas abertas no mesmo programa: a turma A (de
 * origem), onde o catequizando X tem uma falta num encontro realizado sobre o tema T, e a turma
 * B (do catequista de teste), com um encontro planejado de hoje sobre o mesmo tema T. Imprime os
 * ids e dados em JSON. Roda via `tsx` (como o criar-chamada.ts) porque o client do Prisma é ESM.
 * Uso: tsx tests/e2e/criar-reposicao.ts "<sufixo>"
 */
import { prisma } from "@/lib/prisma";
import { hojeCivil } from "@/modules/compartilhado/datas";
import { CATEQUISTA } from "./fixtures";

const dia = (d: string): Date => new Date(`${d}T00:00:00Z`);
const INSCRITOS_B = ["Ana Souza", "Bruno Lima"];

async function main() {
  if (!/acutis_test/.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("O e2e só roda contra o banco acutis_test.");
  }
  const sufixo = process.argv[2];
  if (!sufixo) throw new Error("Informe o sufixo.");
  const hoje = hojeCivil();
  const catequista = await prisma.user.findUniqueOrThrow({
    where: { email: CATEQUISTA.email },
    select: { id: true },
  });
  const turmaA = await prisma.turma.create({
    data: { nome: `Turma Origem ${sufixo}`, ciclo: 2026, diaSemana: "domingo", horario: "08:00" },
    select: { id: true, nome: true },
  });
  const turmaB = await prisma.turma.create({
    data: { nome: `Turma Visitada ${sufixo}`, ciclo: 2026, diaSemana: "sabado", horario: "09:30" },
    select: { id: true, nome: true },
  });
  await prisma.designacao.create({ data: { turmaId: turmaB.id, userId: catequista.id } });
  const tema = await prisma.tema.create({
    data: {
      titulo: `Tema Reposição ${sufixo}`,
      chave: `tema reposicao ${sufixo}`.toLowerCase(),
      // Posição negativa: nunca fica entre os temas que outros specs criam em sequência (max+1).
      posicao: -1_000_000 - Math.floor(Math.random() * 1_000_000),
    },
    select: { id: true },
  });

  const telefone = "11987654321";
  const email = `contato.${sufixo}@familia.teste`;
  const nomeX = `Xênia Reposição ${sufixo}`;
  const x = await prisma.catequizando.create({
    data: { nome: nomeX, dataNascimento: dia("2014-06-02"), telefone, email },
    select: { id: true },
  });
  await prisma.inscricao.create({
    data: { turmaId: turmaA.id, catequizandoId: x.id, dataEntrada: dia("2026-01-05") },
  });
  // Encontro realizado da turma A sobre o tema T, com a falta de X.
  const encontroA = await prisma.encontro.create({
    data: {
      turmaId: turmaA.id,
      temaId: tema.id,
      data: dia("2026-03-07"),
      horario: "08:00",
      situacao: "realizado",
    },
    select: { id: true },
  });
  await prisma.presenca.create({
    data: {
      encontroId: encontroA.id,
      turmaId: turmaA.id,
      catequizandoId: x.id,
      status: "ausente",
    },
  });

  const nomes: string[] = [];
  for (const base of INSCRITOS_B) {
    const nome = `${base} ${sufixo}`;
    const c = await prisma.catequizando.create({
      data: { nome, dataNascimento: dia("2015-03-10"), telefone: "11999990000" },
      select: { id: true },
    });
    await prisma.inscricao.create({
      data: { turmaId: turmaB.id, catequizandoId: c.id, dataEntrada: dia("2026-01-05") },
    });
    nomes.push(nome);
  }
  const encontroB = await prisma.encontro.create({
    data: { turmaId: turmaB.id, temaId: tema.id, data: dia(hoje), horario: "09:30" },
    select: { id: true },
  });
  process.stdout.write(
    JSON.stringify({
      turmaAId: turmaA.id,
      turmaANome: turmaA.nome,
      turmaBId: turmaB.id,
      turmaBNome: turmaB.nome,
      encontroBId: encontroB.id,
      temaTitulo: `Tema Reposição ${sufixo}`,
      xId: x.id,
      xNome: nomeX,
      xBusca: `xenia reposicao ${sufixo}`,
      telefone,
      email,
      nomesB: nomes,
    }),
  );
}

main()
  .finally(() => prisma.$disconnect())
  .catch((erro: unknown) => {
    console.error(erro);
    process.exit(1);
  });
