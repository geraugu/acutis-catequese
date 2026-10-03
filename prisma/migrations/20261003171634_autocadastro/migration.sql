-- CreateTable
CREATE TABLE "link_autocadastro" (
    "id" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiraEm" DATE,
    "desativadoEm" TIMESTAMP(3),
    "criadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "link_autocadastro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ficha_autocadastro" (
    "catequizandoId" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "consentidoEm" TIMESTAMP(3) NOT NULL,
    "versaoConsentimento" TEXT NOT NULL,
    "recebidaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisadaEm" TIMESTAMP(3),

    CONSTRAINT "ficha_autocadastro_pkey" PRIMARY KEY ("catequizandoId")
);

-- CreateTable
CREATE TABLE "limite_autocadastro" (
    "chave" TEXT NOT NULL,
    "contagem" INTEGER NOT NULL,
    "janelaInicio" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "limite_autocadastro_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE UNIQUE INDEX "link_autocadastro_token_key" ON "link_autocadastro"("token");

-- CreateIndex
CREATE INDEX "link_autocadastro_turmaId_idx" ON "link_autocadastro"("turmaId");

-- CreateIndex
CREATE INDEX "ficha_autocadastro_turmaId_revisadaEm_idx" ON "ficha_autocadastro"("turmaId", "revisadaEm");

-- AddForeignKey
ALTER TABLE "link_autocadastro" ADD CONSTRAINT "link_autocadastro_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_autocadastro" ADD CONSTRAINT "ficha_autocadastro_catequizandoId_fkey" FOREIGN KEY ("catequizandoId") REFERENCES "catequizando"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_autocadastro" ADD CONSTRAINT "ficha_autocadastro_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_autocadastro" ADD CONSTRAINT "ficha_autocadastro_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "link_autocadastro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Um único link não desativado por turma (1.3). Índice parcial, fora do schema do Prisma.
CREATE UNIQUE INDEX link_ativo_unico ON link_autocadastro ("turmaId") WHERE "desativadoEm" IS NULL;
