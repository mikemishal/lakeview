-- CreateTable
CREATE TABLE "AccountProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "companyName" TEXT,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountProfile_authUserId_key" ON "AccountProfile"("authUserId");

-- CreateIndex
CREATE INDEX "AccountProfile_authUserId_idx" ON "AccountProfile"("authUserId");

-- CreateIndex
CREATE INDEX "AccountProfile_email_idx" ON "AccountProfile"("email");
