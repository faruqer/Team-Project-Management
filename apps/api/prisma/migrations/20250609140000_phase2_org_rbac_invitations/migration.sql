-- CreateEnum
CREATE TYPE "OrgTheme" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- AlterEnum: migrate UserRole values
ALTER TYPE "UserRole" RENAME VALUE 'OWNER' TO 'SUPER_ADMIN';
ALTER TYPE "UserRole" RENAME VALUE 'ADMIN' TO 'ORGANIZATION_ADMIN';
ALTER TYPE "UserRole" RENAME VALUE 'MEMBER' TO 'TEAM_MEMBER';
ALTER TYPE "UserRole" ADD VALUE 'PROJECT_MANAGER';
ALTER TYPE "UserRole" ADD VALUE 'CLIENT';

-- AlterTable: organization settings
ALTER TABLE "organizations" ADD COLUMN "logo_url" TEXT;
ALTER TABLE "organizations" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "organizations" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "organizations" ADD COLUMN "theme" "OrgTheme" NOT NULL DEFAULT 'LIGHT';

-- AlterTable: user profile fields
ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;
ALTER TABLE "users" ADD COLUMN "bio" TEXT;
ALTER TABLE "users" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "deactivated_at" TIMESTAMP(3);

-- AlterTable: update default role
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'TEAM_MEMBER';

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "invited_by_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");

-- CreateIndex
CREATE INDEX "invitations_organization_id_idx" ON "invitations"("organization_id");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "invitations"("email");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
