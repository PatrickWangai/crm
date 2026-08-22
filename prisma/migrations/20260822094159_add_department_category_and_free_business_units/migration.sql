-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "category" TEXT;

-- AlterTable
-- business_units.code widens from the fixed BusinessUnitCode enum to a
-- plain string, so business units become admin-creatable/deletable at
-- runtime instead of requiring a schema change + deploy for a new one.
-- Hand-edited from Prisma's auto-generated drop-and-recreate (which would
-- have failed outright: the column is NOT NULL and the table has rows) to
-- an in-place USING cast, which preserves every existing value losslessly
-- ("MGC" the enum label becomes "MGC" the text value) and keeps the
-- existing business_units_code_key unique index intact.
ALTER TABLE "business_units" ALTER COLUMN "code" TYPE TEXT USING "code"::TEXT;

-- DropEnum
DROP TYPE "BusinessUnitCode";
