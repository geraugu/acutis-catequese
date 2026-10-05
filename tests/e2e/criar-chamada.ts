/**
 * Prepara uma turma aberta com o catequista de teste designado, inscritos e um encontro
 * planejado com a data de hoje, direto no banco de teste, e imprime os ids em JSON. Roda via
 * `tsx` (como o criar-ficha-pendente.ts) porque o client gerado do Prisma é ESM.
 * Uso: tsx tests/e2e/criar-chamada.ts "<sufixo>"
 */
import { prisma } from "@/lib/prisma";
import { hojeCivil } from "@/modules/compartilhado/datas";
import { CATEQUISTA } from "./fixtures";

const dia = (d: string): Date => new Date(`${d}T00:00:00Z`);
const NOMES = ["Ana Souza", "Bruno Lima", "Carla Dias", "Davi Rocha"];

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
  const turma = await prisma.turma.create({
    data: { nome: `Turma Chamada ${sufixo}`, ciclo: 2026, diaSemana: "sabado", horario: "09:30" },
    select: { id: true, nome: true },
  });
  await prisma.designacao.create({ data: { turmaId: turma.id, userId: catequista.id } });
  const tema = await prisma.tema.create({
    data: {
      titulo: `Tema Chamada ${sufixo}`,
      chave: `tema chamada ${sufixo}`.toLowerCase(),
      // Posição negativa: nunca fica entre os temas que outros specs criam em sequência (max+1).
      posicao: -1_000_000 - Math.floor(Math.random() * 1_000_000),
    },
    select: { id: true },
  });
  const nomes: string[] = [];
  for (const base of NOMES) {
    const nome = `${base} ${sufixo}`;
    const c = await prisma.catequizando.create({
      data: { nome, dataNascimento: dia("2015-03-10"), telefone: "11999990000" },
      select: { id: true },
    });
    await prisma.inscricao.create({
      data: { turmaId: turma.id, catequizandoId: c.id, dataEntrada: dia("2026-01-05") },
    });
    nomes.push(nome);
  }
  const encontro = await prisma.encontro.create({
    data: { turmaId: turma.id, temaId: tema.id, data: dia(hoje), horario: "09:30" },
    select: { id: true },
  });
  process.stdout.write(
    JSON.stringify({ turmaId: turma.id, turmaNome: turma.nome, encontroId: encontro.id, nomes }),
  );
}

main()
  .finally(() => prisma.$disconnect())
  .catch((erro: unknown) => {
    console.error(erro);
    process.exit(1);
  });
