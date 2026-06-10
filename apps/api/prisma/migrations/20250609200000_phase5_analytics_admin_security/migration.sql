-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "organizations" ADD COLUMN "due_date" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN "is_platform_admin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "due_date" TIMESTAMP(3);
