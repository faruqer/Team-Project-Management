-- Must run after enum values are committed (separate migration from phase3 enum additions)
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'PLANNING';
