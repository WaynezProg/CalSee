import { prisma } from "@/lib/db/prisma/client";

export async function migrateUserData(fromUserId?: string, toUserId?: string): Promise<void> {
  if (!fromUserId || !toUserId || fromUserId === toUserId) {
    return;
  }

  try {
    await prisma.$transaction([
      prisma.meal.updateMany({
        where: { userId: fromUserId },
        data: { userId: toUserId },
      }),
      prisma.photo.updateMany({
        where: { userId: fromUserId },
        data: { userId: toUserId },
      }),
    ]);
  } catch (error) {
    console.warn("[auth] user data migration failed", error);
  }
}
