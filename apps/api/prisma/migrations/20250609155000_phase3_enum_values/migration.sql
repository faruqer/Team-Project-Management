-- Enum value additions (isolated so PostgreSQL can commit before use in later migrations)
DO $$ BEGIN
  ALTER TYPE "ProjectStatus" ADD VALUE 'PLANNING';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "ProjectStatus" ADD VALUE 'ON_HOLD';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "TaskStatus" ADD VALUE 'REVIEW';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'TaskPriority' AND e.enumlabel = 'URGENT'
  ) THEN
    ALTER TYPE "TaskPriority" RENAME VALUE 'URGENT' TO 'CRITICAL';
  END IF;
END $$;
