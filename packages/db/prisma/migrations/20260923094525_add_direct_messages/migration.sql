-- AlterEnum
ALTER TYPE "notification_type" ADD VALUE 'message';

-- CreateTable
CREATE TABLE "dm_keys" (
    "user_id" UUID NOT NULL,
    "public_key" BYTEA NOT NULL,
    "wrapped_secret_key" BYTEA NOT NULL,
    "wrap_nonce" BYTEA NOT NULL,
    "kdf_salt" BYTEA NOT NULL,
    "kdf_params" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dm_keys_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "dm_conversations" (
    "id" UUID NOT NULL,
    "user_a_id" UUID NOT NULL,
    "user_b_id" UUID NOT NULL,
    "user_a_unread" INTEGER NOT NULL DEFAULT 0,
    "user_b_unread" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "dm_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dm_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "nonce" BYTEA NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dm_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dm_conversations_user_b_id_idx" ON "dm_conversations"("user_b_id");

-- CreateIndex
CREATE INDEX "dm_conversations_last_message_at_idx" ON "dm_conversations"("last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "dm_conversations_user_a_id_user_b_id_key" ON "dm_conversations"("user_a_id", "user_b_id");

-- CreateIndex
CREATE INDEX "dm_messages_conversation_id_id_idx" ON "dm_messages"("conversation_id", "id");

-- AddForeignKey
ALTER TABLE "dm_keys" ADD CONSTRAINT "dm_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_conversations" ADD CONSTRAINT "dm_conversations_user_a_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_conversations" ADD CONSTRAINT "dm_conversations_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "dm_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-added. The two parties are stored in id order so one row serves both
-- directions; Prisma cannot state this, so the database does.
ALTER TABLE "dm_conversations"
  ADD CONSTRAINT "dm_conversations_ordered_pair_check"
  CHECK ("user_a_id" < "user_b_id");
