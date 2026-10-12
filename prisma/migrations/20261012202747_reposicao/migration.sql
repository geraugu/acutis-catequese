-- CreateEnum
CREATE TYPE "situacao_reserva" AS ENUM ('reservada', 'compareceu', 'nao_compareceu', 'cancelada');

-- CreateTable
CREATE TABLE "reserva_reposicao" (
    "id" TEXT NOT NULL,
    "catequizandoId" TEXT NOT NULL,
    "temaId" TEXT NOT NULL,
    "encontroId" TEXT NOT NULL,
    "turmaOrigemId" TEXT NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "situacao" "situacao_reserva" NOT NULL DEFAULT 'reservada',
    "motivoCancelamento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reserva_reposicao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reserva_reposicao_catequizandoId_idx" ON "reserva_reposicao"("catequizandoId");

-- CreateIndex
CREATE INDEX "reserva_reposicao_encontroId_idx" ON "reserva_reposicao"("encontroId");

-- AddForeignKey
ALTER TABLE "reserva_reposicao" ADD CONSTRAINT "reserva_reposicao_catequizandoId_fkey" FOREIGN KEY ("catequizandoId") REFERENCES "catequizando"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_reposicao" ADD CONSTRAINT "reserva_reposicao_temaId_fkey" FOREIGN KEY ("temaId") REFERENCES "tema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_reposicao" ADD CONSTRAINT "reserva_reposicao_encontroId_fkey" FOREIGN KEY ("encontroId") REFERENCES "encontro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_reposicao" ADD CONSTRAINT "reserva_reposicao_turmaOrigemId_fkey" FOREIGN KEY ("turmaOrigemId") REFERENCES "turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Uma reserva ativa por catequizando e tema (SQL manual; o Prisma não modela índice parcial)
CREATE UNIQUE INDEX reserva_ativa_unica ON reserva_reposicao ("catequizandoId", "temaId") WHERE "situacao" = 'reservada';
