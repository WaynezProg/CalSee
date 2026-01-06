import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma/client";
import { calculateNutritionTotals } from "@/lib/utils/nutrition-calculator";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized", message: "Unauthorized" }, { status: 401 });
  }

  // Build list of user IDs to query (primary + provider ID if different)
  const userIds: string[] = [session.user.id];
  if (session.user.providerId && session.user.providerId !== session.user.id) {
    userIds.push(session.user.providerId);
  }

  const since = request.nextUrl.searchParams.get("since");
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 100;

  try {
    const meals = await prisma.meal.findMany({
      where: {
        userId: { in: userIds },
        ...(since ? { updatedAt: { gt: new Date(since) } } : {}),
      },
      include: { items: true },
      orderBy: { timestamp: "desc" },
      take: Number.isFinite(limit) ? limit : 100,
    });

    return NextResponse.json({ meals, hasMore: false });
  } catch (error) {
    console.error("[sync] Failed to load meals", error);
    return NextResponse.json(
      { error: "server_error", message: "Failed to load meals" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized", message: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const data = await request.json();

  if (!data?.items || !Array.isArray(data.items) || data.items.length === 0) {
    return NextResponse.json(
      { error: "validation_error", message: "Meal items are required" },
      { status: 400 },
    );
  }

  const totals = calculateNutritionTotals(data.items);

  try {
    const meal = await prisma.meal.create({
      data: {
        userId,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        mealType: data.mealType ?? null,
        photoId: data.photoId ?? null,
        totalCalories: totals.totalCalories,
        totalProtein: totals.totalProtein,
        totalCarbs: totals.totalCarbs,
        totalFat: totals.totalFat,
        items: {
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

    return NextResponse.json(meal, { status: 201 });
  } catch (error) {
    console.error("[sync] Failed to create meal", error);
    return NextResponse.json(
      { error: "server_error", message: "Failed to create meal" },
      { status: 500 },
    );
  }
}
