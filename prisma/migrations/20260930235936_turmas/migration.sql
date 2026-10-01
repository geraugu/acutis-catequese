-- CreateEnum
CREATE TYPE "dia_semana" AS ENUM ('domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado');

-- CreateEnum
CREATE TYPE "motivo_saida" AS ENUM ('desligamento', 'transferencia', 'encerramento', 'inativacao');

-- CreateTable
CREATE TABLE "turma" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ciclo" INTEGER NOT NULL,
    "diaSemana" "dia_semana" NOT NULL,
    "horario" TEXT NOT NULL,
    "local" TEXT,
    "observacoes" TEXT,
    "vagas" INTEGER,
    "encerradaEm" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "turma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designacao" (
    "id" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "designadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removidoEm" TIMESTAMP(3),

    CONSTRAINT "designacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscricao" (
    "id" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "catequizandoId" TEXT NOT NULL,
    "dataEntrada" DATE NOT NULL,
    "dataSaida" DATE,
    "motivoSaida" "motivo_saida",

    CONSTRAINT "inscricao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "turma_ciclo_idx" ON "turma"("ciclo");

-- CreateIndex
CREATE INDEX "designacao_userId_idx" ON "designacao"("userId");

-- CreateIndex
CREATE INDEX "inscricao_turmaId_idx" ON "inscricao"("turmaId");

-- AddForeignKey
ALTER TABLE "designacao" ADD CONSTRAINT "designacao_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designacao" ADD CONSTRAINT "designacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricao" ADD CONSTRAINT "inscricao_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricao" ADD CONSTRAINT "inscricao_catequizandoId_fkey" FOREIGN KEY ("catequizandoId") REFERENCES "catequizando"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Índices parciais (vigência e nome único entre turmas abertas)
CREATE UNIQUE INDEX inscricao_vigente_unica ON inscricao ("catequizandoId") WHERE "dataSaida" IS NULL;
CREATE UNIQUE INDEX designacao_vigente_unica ON designacao ("turmaId","userId") WHERE "removidoEm" IS NULL;
CREATE UNIQUE INDEX turma_nome_aberta_unica ON turma (lower(nome), ciclo) WHERE "encerradaEm" IS NULL;

-- Remove designações vigentes ao inativar o membro ou tirar o papel de catequista
CREATE FUNCTION turmas_remover_designacoes() RETURNS trigger AS $$
BEGIN
  IF (COALESCE(NEW.banned,false) AND NOT COALESCE(OLD.banned,false))
     OR (OLD.role = 'catequista' AND NEW.role IS DISTINCT FROM 'catequista') THEN
    UPDATE designacao SET "removidoEm" = now() WHERE "userId" = NEW.id AND "removidoEm" IS NULL;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER user_remove_designacoes AFTER UPDATE OF banned, role ON "user"
  FOR EACH ROW EXECUTE FUNCTION turmas_remover_designacoes();

-- Encerra a inscrição vigente ao inativar o catequizando
CREATE FUNCTION turmas_desligar_inativado() RETURNS trigger AS $$
BEGIN
  IF NEW.estado = 'inativo' AND OLD.estado <> 'inativo' THEN
    UPDATE inscricao SET "dataSaida" = (now() AT TIME ZONE 'America/Sao_Paulo')::date, "motivoSaida" = 'inativacao'
      WHERE "catequizandoId" = NEW.id AND "dataSaida" IS NULL;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER catequizando_desliga_inscricao AFTER UPDATE OF estado ON catequizando
  FOR EACH ROW EXECUTE FUNCTION turmas_desligar_inativado();
