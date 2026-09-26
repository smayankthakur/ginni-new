-- AlterTable: new referral columns. referralCode starts nullable so
-- existing rows (your own account, the demo account) can be backfilled
-- with a real unique value before it's locked to NOT NULL + UNIQUE below —
-- a brand-new signup never hits this path, it always generates its own
-- code in application code (lib/referral.js) before the row is created.
ALTER TABLE "User" ADD COLUMN "referredByUserId" TEXT;
ALTER TABLE "User" ADD COLUMN "bonusReadings" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "referralRewarded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;

-- Backfill: give every existing user a real, unique 8-character code.
UPDATE "User"
SET "referralCode" = upper(substring(md5(random()::text || "id") from 1 for 8))
WHERE "referralCode" IS NULL;

-- Now that every row has a value, enforce the real constraints.
ALTER TABLE "User" ALTER COLUMN "referralCode" SET NOT NULL;
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredByUserId_fkey" FOREIGN KEY ("referredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
