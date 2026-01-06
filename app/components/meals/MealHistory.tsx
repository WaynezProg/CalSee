"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { Meal } from "@/types/sync";
import { cacheThumbnail, deleteThumbnail, getThumbnail } from "@/lib/db/indexeddb/thumbnail-cache";
import { syncMealWithQueue } from "@/lib/services/sync/meal-sync";
import { MealDetailModal } from "./MealDetailModal";

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

async function fetchPhotoBlob(photoId: string, type: "main" | "thumbnail") {
  const response = await fetch(`/api/sync/photos/proxy?photoId=${photoId}&type=${type}`);
  if (!response.ok) {
    throw new Error("Photo proxy request failed");
  }
  return response.blob();
}

export function MealHistory() {
  const { t } = useI18n();
  const [meals, setMeals] = useState<MealWithThumbnail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});
  const [photoLoadingIds, setPhotoLoadingIds] = useState<Record<string, boolean>>({});
  const [selectedMeal, setSelectedMeal] = useState<MealWithThumbnail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadMeals = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/sync/meals");
      if (!response.ok) {
        throw new Error("Failed to load meals");
      }
      const data = await response.json();
      const newMeals = data.meals ?? [];
      setMeals(newMeals);
      
      // Clear all loading refs when meals are refreshed
      // This allows previously failed photos to be retried after refresh,
      // while still preventing infinite retry loops within the same effect run
      loadingPhotoIdsRef.current.clear();
    } catch (err) {
      setError("Unable to load meal history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadMeals();
  }, []);

  // Track which photoIds are being loaded (use ref to avoid re-triggering effect)
  const loadingPhotoIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let isActive = true;

    const loadThumbnails = async () => {
      // Filter to meals with photos that haven't been loaded yet
      const mealsToLoad = meals.filter(
        meal => meal.photoId && !meal.thumbnailUrl && !loadingPhotoIdsRef.current.has(meal.photoId)
      );

      if (mealsToLoad.length === 0) return;

      // Mark these as being loaded to prevent duplicate fetches
      mealsToLoad.forEach(meal => {
        if (meal.photoId) loadingPhotoIdsRef.current.add(meal.photoId);
      });

      // Load all thumbnails in parallel
      const results = await Promise.allSettled(
        mealsToLoad.map(async meal => {
          const photoId = meal.photoId!;

          const loadFromCache = async (): Promise<string | null> => {
            const cached = await getThumbnail(photoId);
            if (cached) {
              return URL.createObjectURL(cached);
            }
            return null;
          };

          const loadFromServer = async (): Promise<string | null> => {
            try {
              const blob = await fetchPhotoBlob(photoId, "thumbnail");
              await cacheThumbnail(photoId, blob);
              return URL.createObjectURL(blob);
            } catch {
              // Fallback to main photo
              try {
                const blob = await fetchPhotoBlob(photoId, "main");
                return URL.createObjectURL(blob);
              } catch {
                // Last resort: use signed URL directly in <img>
                try {
                  const signed = await fetchSignedUrl(photoId, "thumbnail");
                  return signed.url;
                } catch {
                  return null;
                }
              }
            }
          };

          const url = (await loadFromCache()) || (await loadFromServer());
          return { mealId: meal.id, photoId, url };
        })
      );

      if (!isActive) return;

      // Batch update all thumbnails at once and clean up loading ref
      const urlMap = new Map<string, string>();
      results.forEach((result, index) => {
        const meal = mealsToLoad[index];
        const photoId = meal.photoId!;
        
        if (result.status === "fulfilled" && result.value.url && result.value.mealId) {
          // Only remove from loading ref when we successfully got a valid URL
          // This prevents infinite retry loops for permanently unavailable photos
          urlMap.set(result.value.mealId, result.value.url);
          loadingPhotoIdsRef.current.delete(photoId);
        } else if (result.status === "fulfilled" && !result.value.url) {
          // All fallback attempts failed (null URL) - keep photoId in loading set
          // to prevent infinite retry loops for permanently unavailable photos
          // The photoId will remain in the set, blocking future retry attempts
        } else if (result.status === "rejected") {
          // Promise rejected - remove to allow retry for transient network errors
          // Rejected promises are typically temporary failures that should be retried
          loadingPhotoIdsRef.current.delete(photoId);
        }
      });

      if (urlMap.size > 0) {
        setMeals(prev =>
          prev.map(meal =>
            meal.id && urlMap.has(meal.id)
              ? { ...meal, thumbnailUrl: urlMap.get(meal.id) }
              : meal
          )
        );
      }
    };

    void loadThumbnails();

    return () => {
      isActive = false;
    };
  }, [meals]);

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
        // Remove from loading ref when meal is deleted
        loadingPhotoIdsRef.current.delete(meal.photoId);
      }
      setMeals(prev => prev.filter(item => item.id !== meal.id));
    } catch (err) {
      setError("Unable to delete meal. It will retry in the background.");
    }
  };

  const handleOpenDetail = async (meal: MealWithThumbnail) => {
    // Load full photo if needed
    if (meal.photoId && !meal.fullPhotoUrl) {
      await handleLoadFullPhoto(meal);
    }
    setSelectedMeal(meal);
    setIsModalOpen(true);
  };

  const handleCloseDetail = () => {
    setIsModalOpen(false);
    setSelectedMeal(null);
  };

  const handleSaveMeal = async (updatedMeal: Meal) => {
    try {
      await syncMealWithQueue(updatedMeal, "update");
      // Update local state
      setMeals(prev =>
        prev.map(m => (m.id === updatedMeal.id ? { ...m, ...updatedMeal } : m))
      );
      // Update selected meal for modal
      setSelectedMeal(prev => prev ? { ...prev, ...updatedMeal } : null);
    } catch (err) {
      throw err; // Let modal handle the error
    }
  };

  const handleDeleteFromModal = async (meal: Meal) => {
    await handleDeleteMeal(meal as MealWithThumbnail);
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
          const mealTypeLabel = meal.mealType
            ? t(`mealForm.mealTypeOptions.${meal.mealType}`)
            : null;
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
                    {mealTypeLabel && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                        {mealTypeLabel}
                      </span>
                    )}
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
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-3 py-1 text-blue-600 hover:bg-blue-50"
                  onClick={() => handleOpenDetail(meal)}
                >
                  查看詳情
                </button>
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

      {/* Meal Detail Modal */}
      {selectedMeal && (
        <MealDetailModal
          meal={selectedMeal}
          photoUrl={selectedMeal.fullPhotoUrl}
          isOpen={isModalOpen}
          onClose={handleCloseDetail}
          onSave={handleSaveMeal}
          onDelete={handleDeleteFromModal}
        />
      )}
    </div>
  );
}
