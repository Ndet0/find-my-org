-- DropIndex
DROP INDEX "accounts_provider_id_account_id_key";

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "issuer" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "accounts_issuer_account_id_key" ON "accounts"("issuer", "account_id");

