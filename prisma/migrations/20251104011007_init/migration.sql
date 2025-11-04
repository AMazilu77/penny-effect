-- AlterTable
ALTER TABLE "public"."Organization" ADD COLUMN     "cryptoWalletBTC" TEXT,
ADD COLUMN     "cryptoWalletETH" TEXT,
ADD COLUMN     "locationCity" TEXT,
ADD COLUMN     "locationCountry" TEXT,
ADD COLUMN     "locationState" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."CauseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "CauseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubCause" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "SubCause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserInterest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subcauseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserLocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "UserLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_OrgCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OrgCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "CauseCategory_name_key" ON "public"."CauseCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserLocation_userId_key" ON "public"."UserLocation"("userId");

-- CreateIndex
CREATE INDEX "_OrgCategories_B_index" ON "public"."_OrgCategories"("B");

-- AddForeignKey
ALTER TABLE "public"."SubCause" ADD CONSTRAINT "SubCause_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."CauseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserInterest" ADD CONSTRAINT "UserInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserInterest" ADD CONSTRAINT "UserInterest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."CauseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserInterest" ADD CONSTRAINT "UserInterest_subcauseId_fkey" FOREIGN KEY ("subcauseId") REFERENCES "public"."SubCause"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserLocation" ADD CONSTRAINT "UserLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_OrgCategories" ADD CONSTRAINT "_OrgCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."CauseCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_OrgCategories" ADD CONSTRAINT "_OrgCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
