import { PlannedMeal, PlanDay, MealMoment, Recipe, PlannedMealStatus, PlannedMealSource } from '../types/domain';

export class PlanningService {
  /**
   * Creates a new planned meal.
   */
  public createPlannedMeal(params: {
    day: PlanDay;
    mealMoment: MealMoment;
    recipe?: Recipe;
    recipeName?: string;
    servings?: number;
    source?: PlannedMealSource;
    notes?: string;
  }): PlannedMeal {
    const defaultServings = params.servings || 2;
    const name = params.recipe ? params.recipe.name : params.recipeName || 'Comida planificada';

    return {
      id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      day: params.day,
      mealMoment: params.mealMoment,
      recipeId: params.recipe?.id,
      recipeName: name,
      servings: defaultServings,
      status: 'planned',
      source: params.source || (params.recipe ? 'recommendation_save' : 'manual'),
      notes: params.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Updates servings for a planned meal.
   */
  public updateServings(mealId: string, servings: number, plannedMeals: PlannedMeal[]): PlannedMeal[] {
    const cleanServings = Math.max(1, Math.min(12, Math.round(servings)));
    return plannedMeals.map((m) =>
      m.id === mealId ? { ...m, servings: cleanServings, updatedAt: new Date().toISOString() } : m
    );
  }

  /**
   * Replaces the recipe of a planned meal.
   */
  public replaceRecipe(mealId: string, newRecipe: Recipe, plannedMeals: PlannedMeal[]): PlannedMeal[] {
    return plannedMeals.map((m) =>
      m.id === mealId
        ? {
            ...m,
            recipeId: newRecipe.id,
            recipeName: newRecipe.name,
            updatedAt: new Date().toISOString(),
          }
        : m
    );
  }

  /**
   * Removes a planned meal.
   */
  public removePlannedMeal(mealId: string, plannedMeals: PlannedMeal[]): PlannedMeal[] {
    return plannedMeals.filter((m) => m.id !== mealId);
  }

  /**
   * Links and marks a planned meal as completed upon real meal consumption.
   */
  public markCompleted(mealId: string, plannedMeals: PlannedMeal[]): PlannedMeal[] {
    return plannedMeals.map((m) =>
      m.id === mealId ? { ...m, status: 'completed' as PlannedMealStatus, updatedAt: new Date().toISOString() } : m
    );
  }
}

export const planningService = new PlanningService();
