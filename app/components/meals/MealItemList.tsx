"use client";

import type { MealItem } from "@/types/sync";

interface MealItemListProps {
  items: MealItem[];
  onChange: (items: MealItem[]) => void;
}

export function MealItemList({ items, onChange }: MealItemListProps) {
  const updateItem = (index: number, patch: Partial<MealItem>) => {
    const next = items.map((item, idx) => (idx === index ? { ...item, ...patch } : item));
    onChange(next);
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, idx) => idx !== index);
    onChange(next);
  };

  return (
    <div>
      {items.map((item, index) => (
        <div key={index} className="mb-4 rounded border border-gray-200 p-3">
          <div className="grid gap-2 md:grid-cols-2">
            <input
              className="rounded border border-gray-300 p-2"
              placeholder="Food name"
              value={item.foodName}
              onChange={event => updateItem(index, { foodName: event.target.value })}
            />
            <input
              className="rounded border border-gray-300 p-2"
              placeholder="Portion size"
              type="number"
              value={item.portionSize}
              onChange={event => updateItem(index, { portionSize: Number(event.target.value) })}
            />
            <input
              className="rounded border border-gray-300 p-2"
              placeholder="Portion unit"
              value={item.portionUnit}
              onChange={event => updateItem(index, { portionUnit: event.target.value })}
            />
            <input
              className="rounded border border-gray-300 p-2"
              placeholder="Calories"
              type="number"
              value={item.calories ?? ""}
              onChange={event =>
                updateItem(index, {
                  calories: event.target.value === "" ? undefined : Number(event.target.value),
                })
              }
            />
            <input
              className="rounded border border-gray-300 p-2"
              placeholder="Protein (g)"
              type="number"
              value={item.protein ?? ""}
              onChange={event =>
                updateItem(index, {
                  protein: event.target.value === "" ? undefined : Number(event.target.value),
                })
              }
            />
            <input
              className="rounded border border-gray-300 p-2"
              placeholder="Carbs (g)"
              type="number"
              value={item.carbs ?? ""}
              onChange={event =>
                updateItem(index, {
                  carbs: event.target.value === "" ? undefined : Number(event.target.value),
                })
              }
            />
            <input
              className="rounded border border-gray-300 p-2"
              placeholder="Fat (g)"
              type="number"
              value={item.fat ?? ""}
              onChange={event =>
                updateItem(index, {
                  fat: event.target.value === "" ? undefined : Number(event.target.value),
                })
              }
            />
          </div>
          <button
            type="button"
            className="mt-2 text-sm text-red-600"
            onClick={() => removeItem(index)}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
