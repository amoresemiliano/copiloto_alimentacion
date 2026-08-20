import {
  InventoryItem,
  MealEvent,
  Recipe,
  UserContext,
} from '../types/domain';
import {
  INITIAL_INVENTORY_ITEMS,
  INITIAL_RECENT_MEALS,
  INITIAL_RECIPES,
  INITIAL_USER_CONTEXT,
} from '../data/fixtures';

const KEYS = {
  INVENTORY: 'copiloto_inventory_v1',
  MEALS: 'copiloto_recent_meals_v1',
  CONTEXT: 'copiloto_user_context_v1',
  CHOSEN_RECIPE_ID: 'copiloto_chosen_recipe_id_v1',
  REJECTED_IDS: 'copiloto_rejected_recipe_ids_v1',
};

export class StorageService {
  public getContext(): UserContext {
    try {
      const raw = localStorage.getItem(KEYS.CONTEXT);
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    return { ...INITIAL_USER_CONTEXT };
  }

  public saveContext(context: UserContext): void {
    try {
      localStorage.setItem(KEYS.CONTEXT, JSON.stringify(context));
    } catch {
      // fallback
    }
  }

  public getInventory(): InventoryItem[] {
    try {
      const raw = localStorage.getItem(KEYS.INVENTORY);
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    return [...INITIAL_INVENTORY_ITEMS];
  }

  public saveInventory(inventory: InventoryItem[]): void {
    try {
      localStorage.setItem(KEYS.INVENTORY, JSON.stringify(inventory));
    } catch {
      // fallback
    }
  }

  public getRecentMeals(): MealEvent[] {
    try {
      const raw = localStorage.getItem(KEYS.MEALS);
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    return [...INITIAL_RECENT_MEALS];
  }

  public saveRecentMeals(meals: MealEvent[]): void {
    try {
      localStorage.setItem(KEYS.MEALS, JSON.stringify(meals));
    } catch {
      // fallback
    }
  }

  public getRecipes(): Recipe[] {
    // In Phase 1 recipes come from our structured domain fixture, ready for future cloud sync
    return [...INITIAL_RECIPES];
  }

  public getChosenRecipeId(): string | null {
    try {
      return localStorage.getItem(KEYS.CHOSEN_RECIPE_ID);
    } catch {
      return null;
    }
  }

  public saveChosenRecipeId(id: string | null): void {
    try {
      if (id) {
        localStorage.setItem(KEYS.CHOSEN_RECIPE_ID, id);
      } else {
        localStorage.removeItem(KEYS.CHOSEN_RECIPE_ID);
      }
    } catch {
      // fallback
    }
  }

  public getRejectedRecipeIds(): string[] {
    try {
      const raw = localStorage.getItem(KEYS.REJECTED_IDS);
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    return [];
  }

  public saveRejectedRecipeIds(ids: string[]): void {
    try {
      localStorage.setItem(KEYS.REJECTED_IDS, JSON.stringify(ids));
    } catch {
      // fallback
    }
  }

  public resetAllToFixtures(): void {
    try {
      localStorage.removeItem(KEYS.INVENTORY);
      localStorage.removeItem(KEYS.MEALS);
      localStorage.removeItem(KEYS.CONTEXT);
      localStorage.removeItem(KEYS.CHOSEN_RECIPE_ID);
      localStorage.removeItem(KEYS.REJECTED_IDS);
    } catch {
      // fallback
    }
  }
}

export const storageService = new StorageService();
