-- AlterTable tasks: add new fields
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "assignee_id" TEXT;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "due_date" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tasks_assignee_id_idx" ON "tasks"("assignee_id");
CREATE INDEX IF NOT EXISTS "tasks_project_id_status_position_idx" ON "tasks"("project_id", "status", "position");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable project_members
CREATE TABLE IF NOT EXISTS "project_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");
CREATE INDEX IF NOT EXISTS "project_members_organization_id_idx" ON "project_members"("organization_id");
CREATE INDEX IF NOT EXISTS "project_members_project_id_idx" ON "project_members"("project_id");

DO $$ BEGIN
  ALTER TABLE "project_members" ADD CONSTRAINT "project_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable task_comments
CREATE TABLE IF NOT EXISTS "task_comments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "task_comments_organization_id_idx" ON "task_comments"("organization_id");
CREATE INDEX IF NOT EXISTS "task_comments_task_id_idx" ON "task_comments"("task_id");
CREATE INDEX IF NOT EXISTS "task_comments_parent_id_idx" ON "task_comments"("parent_id");

DO $$ BEGIN
  ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "task_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable comment_attachments
CREATE TABLE IF NOT EXISTS "comment_attachments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "comment_attachments_organization_id_idx" ON "comment_attachments"("organization_id");
CREATE INDEX IF NOT EXISTS "comment_attachments_comment_id_idx" ON "comment_attachments"("comment_id");

DO $$ BEGIN
  ALTER TABLE "comment_attachments" ADD CONSTRAINT "comment_attachments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "comment_attachments" ADD CONSTRAINT "comment_attachments_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "task_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
