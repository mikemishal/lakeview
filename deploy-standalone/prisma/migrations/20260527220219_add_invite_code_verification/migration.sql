-- AlterTable
ALTER TABLE "AccountProfile" ADD COLUMN     "inviteCodeVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inviteCodeVerifiedAt" TIMESTAMP(3);
