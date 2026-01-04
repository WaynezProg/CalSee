"use client";

import { useEffect, useMemo, useState } from "react";
import type { Meal } from "@/types/sync";
import { cacheThumbnail, deleteThumbnail, getThumbnail } from "@/lib/db/indexeddb/thumbnail-cache";
import { syncMealWithQueue } from "@/lib/services/sync/meal-sync";

interface MealWithThumbnail extends Meal {
  thumbnailUrl?: string;
  fullPhotoUrl?: string;
  fullPhotoExpiresAt?: string;
}

async function fetchSignedUrl(photoId: string, type: "main" | "thumbnail") {
  const response = await fetch(`/api/sync/photos/signed-url?photoId=${photoId}&type=${type}`);
  if (!response.ok) {
    throw new Error("Signed URL request failed");
  }
  return response.json() as Promise<{ url: string; expiresAt: string }>;
}

export function MealHistory() {
  const [meals, setMeals] = useState<MealWithThumbnail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});
  const [photoLoadingIds, setPhotoLoadingIds] = useState<Record<string, boolean>>({});

  const mealsWithPhotos = useMemo(() => meals.filter(meal => meal.photoId), [meals]);

  const loadMeals = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/sync/meals");
      if (!response.ok) {
        throw new Error("Failed to load meals");
      }
      const data = await response.json();
      setMeals(data.meals ?? []);
    } catch (err) {
      setError("Unable to load meal history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadMeals();
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadThumbnails = async () => {
      for (const meal of mealsWithPhotos) {
        if (!meal.photoId) continue;

        try {
          const cached = await getThumbnail(meal.photoId);
          if (cached) {
            const url = URL.createObjectURL(cached);
            if (!isActive) {
              URL.revokeObjectURL(url);
              return;
            }
            setMeals(prev =>
              prev.map(item =>
                item.id === meal.id ? { ...item, thumbnailUrl: url } : item,
              ),
            );
            continue;
          }

          const signed = await fetchSignedUrl(meal.photoId, "thumbnail");
          try {
            const thumbnailResponse = await fetch(signed.url);
            if (!thumbnailResponse.ok) {
              throw new Error("thumbnail_fetch_failed");
            }
            const blob = await thumbnailResponse.blob();
            await cacheThumbnail(meal.photoId, blob);
            const url = URL.createObjectURL(blob);

            if (!isActive) {
              URL.revokeObjectURL(url);
              return;
            }

            setMeals(prev =>
              prev.map(item =>
                item.id === meal.id ? { ...item, thumbnailUrl: url } : item,
              ),
            );
          } catch {
            if (!isActive) return;
            // Fallback to signed URL to avoid CORS/cache issues.
            setMeals(prev =>
              prev.map(item =>
                item.id === meal.id ? { ...item, thumbnailUrl: signed.url } : item,
              ),
            );
          }
        } catch (err) {
          // Ignore thumbnail failures; cached thumbnails will still display.
        }
      }
    };

    void loadThumbnails();

    return () => {
      isActive = false;
    };
  }, [mealsWithPhotos]);

  useEffect(() => {
    const refreshExpired = async () => {
      const expired = meals.filter(meal => {
        if (!meal.fullPhotoUrl || !meal.fullPhotoExpiresAt) return false;
        return new Date(meal.fullPhotoExpiresAt).getTime() <= Date.now();
      });

      for (const meal of expired) {
        await handleLoadFullPhoto(meal);
      }
    };

    void refreshExpired();
  }, [meals]);

  const handleLoadFullPhoto = async (meal: MealWithThumbnail) => {
    if (!meal.photoId) return;

    const expiresAt = meal.fullPhotoExpiresAt ? new Date(meal.fullPhotoExpiresAt) : null;
    const isExpired = !expiresAt || expiresAt.getTime() <= Date.now();

    if (meal.fullPhotoUrl && !isExpired) {
      return;
    }

    try {
      const signed = await fetchSignedUrl(meal.photoId, "main");
      setMeals(prev =>
        prev.map(item =>
          item.id === meal.id
            ? { ...item, fullPhotoUrl: signed.url, fullPhotoExpiresAt: signed.expiresAt }
            : item,
        ),
      );
    } catch (err) {
      setError("Unable to load full photo");
    }
  };

  const handleTogglePhoto = async (meal: MealWithThumbnail) => {
    if (!meal.id) return;
    const mealId = meal.id;
    const expiresAt = meal.fullPhotoExpiresAt ? new Date(meal.fullPhotoExpiresAt) : null;
    const isExpired = !expiresAt || expiresAt.getTime() <= Date.now();

    if (!meal.fullPhotoUrl || isExpired) {
      setPhotoLoadingIds(prev => ({ ...prev, [mealId]: true }));
      await handleLoadFullPhoto(meal);
      setPhotoLoadingIds(prev => ({ ...prev, [mealId]: false }));
    }

    setExpandedMeals(prev => ({ ...prev, [mealId]: !prev[mealId] }));
  };

  const handleDeleteMeal = async (meal: MealWithThumbnail) => {
    if (!meal.id) return;
    const confirmed = window.confirm("Delete this meal?");
    if (!confirmed) return;

    try {
      await syncMealWithQueue(meal, "delete");
      if (meal.photoId) {
        await deleteThumbnail(meal.photoId);
      }
      setMeals(prev => prev.filter(item => item.id !== meal.id));
    } catch (err) {
      setError("Unable to delete meal. It will retry in the background.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Sync meal history</h2>
          <p className="text-sm text-slate-500">
            {meals.length} meal{meals.length === 1 ? "" : "s"} synced to the cloud.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          onClick={loadMeals}
          disabled={isLoading}
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading && meals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Loading synced meals...
        </div>
      ) : null}

      {!isLoading && meals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">No synced meals yet</p>
          <p className="mt-1 text-sm text-slate-500">Add a multi-item meal to see it here.</p>
        </div>
      ) : null}

      <ul className="space-y-3">
        {meals.map(meal => {
          if (!meal.id) {
            return null;
          }
          const mealId = meal.id;
          const isExpanded = !!expandedMeals[mealId];
          const isPhotoLoading = !!photoLoadingIds[mealId];
          return (
            <li
              key={mealId}
              className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm transition hover:border-slate-300"
            >
              <div className="flex gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-2xl bg-slate-100">
                  {meal.thumbnailUrl ? (
                    <img
                      src={meal.thumbnailUrl}
                      alt="Meal thumbnail"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                      No photo
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{new Date(meal.timestamp).toLocaleString()}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                      {meal.items.length} item{meal.items.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {meal.items.map((item, index) => (
                      <div key={index} className="text-sm text-slate-800">
                        {item.foodName} · {item.portionSize} {item.portionUnit}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                {meal.photoId && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-50"
                    onClick={() => handleTogglePhoto(meal)}
                    disabled={isPhotoLoading}
                  >
                    {isPhotoLoading ? "Loading photo..." : isExpanded ? "Hide photo" : "View photo"}
                  </button>
                )}
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-red-200 px-3 py-1 text-red-600 hover:bg-red-50"
                  onClick={() => handleDeleteMeal(meal)}
                >
                  Delete meal
                </button>
              </div>

              {meal.photoId && isExpanded && meal.fullPhotoUrl && (
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                  <img src={meal.fullPhotoUrl} alt="Meal" className="w-full" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
