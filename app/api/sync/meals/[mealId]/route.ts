import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma/client';
import { deletePhoto } from '@/lib/db/s3/client';
import { calculateNutritionTotals } from '@/lib/utils/nutrition-calculator';

interface RouteParams {
  params: Promise<{ mealId: string }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
  }

  // Build list of user IDs to query (primary + provider ID if different)
  const userIds: string[] = [session.user.id];
  if (session.user.providerId && session.user.providerId !== session.user.id) {
    userIds.push(session.user.providerId);
  }
  const { mealId } = await params;

  const meal = await prisma.meal.findFirst({
    where: { id: mealId, userId: { in: userIds } },
  });

  if (!meal) {
    return NextResponse.json({ error: 'not_found', message: 'Meal not found' }, { status: 404 });
  }

  const photoId = meal.photoId ?? undefined;

  try {
    if (photoId) {
      await deletePhoto(photoId);
    }

    await prisma.$transaction([
      prisma.photo.deleteMany({
        where: {
          id: photoId,
          userId: { in: userIds },
        },
      }),
      prisma.meal.delete({ where: { id: meal.id } }),
    ]);

    return NextResponse.json({
      deleted: true,
      mealId: meal.id,
      photoDeleted: Boolean(photoId),
    });
  } catch (error) {
    console.error('[sync] Failed to delete meal', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Failed to delete meal' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
  }

  // Build list of user IDs to query (primary + provider ID if different)
  const userIds: string[] = [session.user.id];
  if (session.user.providerId && session.user.providerId !== session.user.id) {
    userIds.push(session.user.providerId);
  }
  const { mealId } = await params;
  const data = await request.json();

  if (!data?.items || !Array.isArray(data.items) || data.items.length === 0) {
    return NextResponse.json(
      { error: 'validation_error', message: 'Meal items are required' },
      { status: 400 },
    );
  }

  if (!data.updatedAt) {
    return NextResponse.json(
      { error: 'validation_error', message: 'updatedAt is required for conflict detection' },
      { status: 400 },
    );
  }

  const clientUpdatedAt = new Date(data.updatedAt);
  if (Number.isNaN(clientUpdatedAt.getTime())) {
    return NextResponse.json(
      { error: 'validation_error', message: 'updatedAt must be a valid timestamp' },
      { status: 400 },
    );
  }

  const meal = await prisma.meal.findFirst({
    where: { id: mealId, userId: { in: userIds } },
    include: { items: true },
  });

  if (!meal) {
    return NextResponse.json({ error: 'not_found', message: 'Meal not found' }, { status: 404 });
  }

  if (meal.updatedAt > clientUpdatedAt) {
    return NextResponse.json(
      {
        error: 'conflict',
        message: 'Server version is newer',
        serverVersion: meal,
        clientUpdatedAt: clientUpdatedAt.toISOString(),
      },
      { status: 409 },
    );
  }

  const totals = calculateNutritionTotals(data.items);

  try {
    const updatedMeal = await prisma.meal.update({
      where: { id: meal.id },
      data: {
        timestamp: data.timestamp ? new Date(data.timestamp) : meal.timestamp,
        mealType: data.mealType ?? meal.mealType ?? null,
        photoId: data.photoId ?? null,
        totalCalories: totals.totalCalories,
        totalProtein: totals.totalProtein,
        totalCarbs: totals.totalCarbs,
        totalFat: totals.totalFat,
        items: {
          deleteMany: {},
          create: data.items.map((item: any) => ({
            foodName: item.foodName,
            portionSize: item.portionSize,
            portionUnit: item.portionUnit,
            calories: item.calories ?? null,
            protein: item.protein ?? null,
            carbs: item.carbs ?? null,
            fat: item.fat ?? null,
            confidence: item.confidence ?? null,
            notes: item.notes ?? null,
            nutritionSource: item.nutritionSource ?? null,
            // Extended nutrition fields
            fiber: item.fiber ?? null,
            sugar: item.sugar ?? null,
            saturatedFat: item.saturatedFat ?? null,
            sodium: item.sodium ?? null,
            potassium: item.potassium ?? null,
            calcium: item.calcium ?? null,
            iron: item.iron ?? null,
            vitaminA: item.vitaminA ?? null,
            vitaminC: item.vitaminC ?? null,
            vitaminD: item.vitaminD ?? null,
            vitaminB12: item.vitaminB12 ?? null,
            cholesterol: item.cholesterol ?? null,
            // Beverage options
            category: item.category ?? null,
            sugarLevel: item.sugarLevel ?? null,
            iceLevel: item.iceLevel ?? null,
            baseSugar: item.baseSugar ?? null,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json(updatedMeal);
  } catch (error) {
    console.error('[sync] Failed to update meal', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Failed to update meal' },
      { status: 500 },
    );
  }
}
