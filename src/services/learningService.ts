import {
  Recipe,
  UserContext,
  MealEvent,
  RejectionFeedback,
  PlannedMeal,
  PurchaseEvent,
  BehavioralSignal,
  LearningHypothesis,
  AffinityProfile,
  HypothesisStatus,
  MealMoment,
} from '../types/domain';

export class LearningService {
  /**
   * Derives behavioral signals from existing records (meals, rejections, planned meals, purchases).
   */
  public deriveSignalsFromHistory(
    meals: MealEvent[],
    rejections: RejectionFeedback[] = [],
    plannedMeals: PlannedMeal[] = [],
    recipes: Recipe[] = []
  ): BehavioralSignal[] {
    const signals: BehavioralSignal[] = [];

    // 1. Meals logged
    meals.forEach((meal) => {
      const rec = meal.selectedRecipeId ? recipes.find((r) => r.id === meal.selectedRecipeId) : undefined;
      const isRecent = Date.now() - new Date(meal.timestamp).getTime() < 7 * 24 * 3600 * 1000;
      const weight = isRecent ? 1.0 : 0.6;

      signals.push({
        id: `sig_meal_${meal.id}`,
        type: meal.wasSuggested ? 'recipe_selected' : 'meal_logged_spontaneous',
        source: 'implicit',
        timestamp: meal.timestamp,
        recipeId: meal.selectedRecipeId,
        recipeName: meal.recipeName || meal.customText,
        tags: rec ? rec.tags : [],
        ingredientNames: rec ? rec.ingredients.map((i) => i.name) : [],
        mealMoment: meal.mealMoment,
        contextSnapshot: meal.contextSnapshot,
        weight,
      });
    });

    // 2. Rejections with feedback
    rejections.forEach((rej) => {
      const rec = recipes.find((r) => r.id === rej.recipeId);
      signals.push({
        id: `sig_rej_${rej.recommendationId}`,
        type: 'recipe_rejected',
        source: 'explicit',
        timestamp: rej.timestamp,
        recipeId: rej.recipeId,
        recipeName: rec?.name,
        tags: rec ? rec.tags : [],
        ingredientNames: rec ? rec.ingredients.map((i) => i.name) : [],
        rejectionReason: rej.reason,
        weight: 0.8,
      });
    });

    // 3. Planned meals completed or skipped
    plannedMeals.forEach((pm) => {
      const rec = pm.recipeId ? recipes.find((r) => r.id === pm.recipeId) : undefined;
      if (pm.status === 'completed') {
        signals.push({
          id: `sig_plan_comp_${pm.id}`,
          type: 'plan_completed',
          source: 'implicit',
          timestamp: pm.updatedAt || pm.createdAt,
          recipeId: pm.recipeId,
          recipeName: pm.recipeName,
          tags: rec ? rec.tags : [],
          ingredientNames: rec ? rec.ingredients.map((i) => i.name) : [],
          mealMoment: pm.mealMoment,
          weight: 0.9,
        });
      } else if (pm.status === 'skipped') {
        signals.push({
          id: `sig_plan_skip_${pm.id}`,
          type: 'plan_skipped',
          source: 'implicit',
          timestamp: pm.updatedAt || pm.createdAt,
          recipeId: pm.recipeId,
          recipeName: pm.recipeName,
          tags: rec ? rec.tags : [],
          ingredientNames: rec ? rec.ingredients.map((i) => i.name) : [],
          mealMoment: pm.mealMoment,
          weight: 0.7,
        });
      }
    });

    // Sort descending by timestamp
    signals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return signals;
  }

  /**
   * Deterministically calculates the user's AffinityProfile based on signals and user overrides.
   */
  public calculateAffinityProfile(
    signals: BehavioralSignal[],
    existingProfile?: Partial<AffinityProfile>,
    recipes: Recipe[] = []
  ): AffinityProfile {
    const favoriteIngredients = existingProfile?.favoriteIngredients ? [...existingProfile.favoriteIngredients] : [];
    const avoidedIngredients = existingProfile?.avoidedIngredients ? [...existingProfile.avoidedIngredients] : [];

    const tagScores: Record<string, { count: number; totalScore: number }> = {};
    const recipeScores: Record<string, { count: number; score: number }> = {};

    const momentMealTimes: Record<MealMoment, number[]> = {
      desayuno: [],
      almuerzo: [],
      merienda: [],
      cena: [],
    };

    let lowEnergyQuickChoices = 0;
    let lowEnergyTotalChoices = 0;
    let lowEnergySimpleChoices = 0;

    signals.forEach((sig) => {
      // Recipe & tag affinity calculation
      if (sig.type === 'recipe_selected' || sig.type === 'plan_completed') {
        if (sig.recipeId) {
          if (!recipeScores[sig.recipeId]) recipeScores[sig.recipeId] = { count: 0, score: 0 };
          recipeScores[sig.recipeId].count += 1;
          recipeScores[sig.recipeId].score += 0.15 * sig.weight;
        }

        if (sig.tags) {
          sig.tags.forEach((tag) => {
            const key = tag.toLowerCase().trim();
            if (!tagScores[key]) tagScores[key] = { count: 0, totalScore: 0 };
            tagScores[key].count += 1;
            tagScores[key].totalScore += 0.2 * sig.weight;
          });
        }

        if (sig.recipeId) {
          const rec = recipes.find((r) => r.id === sig.recipeId);
          if (rec && sig.mealMoment && momentMealTimes[sig.mealMoment]) {
            momentMealTimes[sig.mealMoment].push(rec.prepTimeMinutes);
          }

          if (rec && sig.contextSnapshot?.energy === 'baja') {
            lowEnergyTotalChoices += 1;
            if (rec.prepTimeMinutes <= 20) lowEnergyQuickChoices += 1;
            if (rec.complexity === 'muy_baja' || rec.complexity === 'baja') lowEnergySimpleChoices += 1;
          }
        }
      } else if (sig.type === 'recipe_rejected') {
        if (sig.recipeId) {
          if (!recipeScores[sig.recipeId]) recipeScores[sig.recipeId] = { count: 0, score: 0 };
          recipeScores[sig.recipeId].count += 1;
          recipeScores[sig.recipeId].score -= 0.1 * sig.weight;
        }

        if (sig.tags && sig.rejectionReason === 'no_me_apetece') {
          sig.tags.forEach((tag) => {
            const key = tag.toLowerCase().trim();
            if (!tagScores[key]) tagScores[key] = { count: 0, totalScore: 0 };
            tagScores[key].totalScore -= 0.08 * sig.weight;
          });
        }
      }
    });

    // Normalize tag affinities to range -1.0 .. +1.0
    const tagAffinities: Record<string, number> = {};
    Object.entries(tagScores).forEach(([tag, val]) => {
      tagAffinities[tag] = Math.max(-1.0, Math.min(1.0, val.totalScore));
    });

    // Normalize recipe affinities to range -0.3 .. +0.3
    const recipeAffinities: Record<string, number> = {};
    Object.entries(recipeScores).forEach(([rId, val]) => {
      recipeAffinities[rId] = Math.max(-0.3, Math.min(0.3, val.score));
    });

    // Moment preferences
    const momentPreferences: AffinityProfile['momentPreferences'] = {};
    (['almuerzo', 'cena', 'desayuno', 'merienda'] as MealMoment[]).forEach((moment) => {
      const times = momentMealTimes[moment];
      if (times.length > 0) {
        const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        momentPreferences[moment as keyof AffinityProfile['momentPreferences']] = {
          maxPreferredTime: avgTime < 25 ? 20 : avgTime < 35 ? 30 : 45,
          preferredComplexity: avgTime <= 20 ? 'baja' : 'media',
        };
      }
    });

    // Generate/preserve hypotheses
    const hypotheses = this.generateHypotheses(
      signals,
      existingProfile?.hypotheses || [],
      tagAffinities,
      favoriteIngredients,
      avoidedIngredients
    );

    return {
      favoriteIngredients,
      avoidedIngredients,
      tagAffinities,
      recipeAffinities,
      momentPreferences,
      energyPatterns: {
        whenLowEnergyPrefersQuick: lowEnergyTotalChoices > 0 && lowEnergyQuickChoices / lowEnergyTotalChoices >= 0.6,
        whenLowEnergyPrefersSimple: lowEnergyTotalChoices > 0 && lowEnergySimpleChoices / lowEnergyTotalChoices >= 0.6,
      },
      hypotheses,
      signalsCount: signals.length,
      lastCalculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates deterministic hypotheses with confidence levels, evidence counts and explanations.
   */
  public generateHypotheses(
    signals: BehavioralSignal[],
    existingHypotheses: LearningHypothesis[] = [],
    tagAffinities: Record<string, number> = {},
    favoriteIngredients: string[] = [],
    avoidedIngredients: string[] = []
  ): LearningHypothesis[] {
    const existingMap = new Map<string, LearningHypothesis>();
    existingHypotheses.forEach((h) => existingMap.set(h.ruleKey, h));

    const hypotheses: LearningHypothesis[] = [];

    // Rule 1: Lunch quick preference (<20 min)
    const lunchSelections = signals.filter(
      (s) => s.type === 'recipe_selected' && s.mealMoment === 'almuerzo'
    );
    if (lunchSelections.length >= 2) {
      const ruleKey = 'hyp_lunch_quick_preference';
      const existing = existingMap.get(ruleKey);
      const confidence = lunchSelections.length >= 4 ? 'alta' : lunchSelections.length >= 2 ? 'media' : 'baja';
      
      hypotheses.push({
        id: existing?.id || 'hyp_lunch_quick',
        category: 'time_preference',
        title: 'Almuerzos ágiles y prácticos',
        description: 'En el almuerzo solés priorizar platos que se resuelven en 20 minutos o menos.',
        evidenceCount: lunchSelections.length,
        confidence,
        status: existing?.status || 'active',
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ruleKey,
        impactDescription: 'Otorga un leve impulso positivo a recetas rápidas al mediodía.',
        targetMoment: 'almuerzo',
        weightBonus: 0.08,
      });
    }

    // Rule 2: Low energy -> Low complexity dishes
    const lowEnergySelections = signals.filter(
      (s) => (s.type === 'recipe_selected' || s.type === 'meal_logged_spontaneous') && s.contextSnapshot?.energy === 'baja'
    );
    if (lowEnergySelections.length >= 1) {
      const ruleKey = 'hyp_low_energy_simple';
      const existing = existingMap.get(ruleKey);
      const confidence = lowEnergySelections.length >= 3 ? 'alta' : lowEnergySelections.length >= 2 ? 'media' : 'baja';

      hypotheses.push({
        id: existing?.id || 'hyp_low_energy',
        category: 'effort_preference',
        title: 'Bajo esfuerzo con poca energía',
        description: 'Cuando indicás energía baja, preferís platos de complejidad baja o muy baja sin pasos complejos.',
        evidenceCount: lowEnergySelections.length,
        confidence,
        status: existing?.status || 'active',
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ruleKey,
        impactDescription: 'Refuerza recetas de baja demanda cognitiva y física.',
        weightBonus: 0.1,
      });
    }

    // Rule 3: Affinity for specific top tags (e.g., 'facil', 'rapido', 'legumbres', 'ensalada', 'verduras')
    Object.entries(tagAffinities).forEach(([tag, score]) => {
      if (score >= 0.4) {
        const ruleKey = `hyp_tag_affinity_${tag}`;
        const existing = existingMap.get(ruleKey);
        const tagEvidence = signals.filter((s) => s.tags?.map((t) => t.toLowerCase()).includes(tag)).length;
        const confidence = tagEvidence >= 4 ? 'alta' : tagEvidence >= 2 ? 'media' : 'baja';

        hypotheses.push({
          id: existing?.id || `hyp_tag_${tag}`,
          category: 'tag_affinity',
          title: `Afinidad con platos tipo "${tag}"`,
          description: `Mostrás una tendencia positiva hacia recetas etiquetadas con "${tag}".`,
          evidenceCount: tagEvidence,
          confidence,
          status: existing?.status || 'active',
          createdAt: existing?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ruleKey,
          impactDescription: `Suma una bonificación prudente (+${(score * 0.1).toFixed(2)}) a platos con este tag.`,
          targetTag: tag,
          weightBonus: Math.min(0.12, score * 0.1),
        });
      }
    });

    // Rule 4: Favorite ingredients explicitly confirmed
    favoriteIngredients.forEach((ing) => {
      const ruleKey = `hyp_fav_ing_${ing.toLowerCase().replace(/\s+/g, '_')}`;
      const existing = existingMap.get(ruleKey);
      hypotheses.push({
        id: existing?.id || `hyp_fav_${ing}`,
        category: 'ingredient_affinity',
        title: `Ingrediente favorito: ${ing}`,
        description: `Indicaste que ${ing} es uno de tus ingredientes de alta preferencia.`,
        evidenceCount: 1,
        confidence: 'alta',
        status: existing?.status || 'confirmed_by_user',
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ruleKey,
        impactDescription: 'Prioriza suavemente recetas que incorporen este ingrediente.',
        targetIngredient: ing,
        weightBonus: 0.12,
      });
    });

    // Rule 5: Avoided ingredients explicitly confirmed
    avoidedIngredients.forEach((ing) => {
      const ruleKey = `hyp_avoid_ing_${ing.toLowerCase().replace(/\s+/g, '_')}`;
      const existing = existingMap.get(ruleKey);
      hypotheses.push({
        id: existing?.id || `hyp_avoid_${ing}`,
        category: 'ingredient_affinity',
        title: `Ingrediente evitado: ${ing}`,
        description: `Configuraste evitar recetas que contengan ${ing}.`,
        evidenceCount: 1,
        confidence: 'alta',
        status: existing?.status || 'confirmed_by_user',
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ruleKey,
        impactDescription: 'Aplica penalización a recetas con este ingrediente para no recomendarlas.',
        targetIngredient: ing,
        weightBonus: -0.35,
      });
    });

    // Rule 6: Planning completion adherence
    const completedPlans = signals.filter((s) => s.type === 'plan_completed').length;
    if (completedPlans >= 2) {
      const ruleKey = 'hyp_plan_adherence';
      const existing = existingMap.get(ruleKey);
      hypotheses.push({
        id: existing?.id || 'hyp_plan_adh',
        category: 'planning_adherence',
        title: 'Buena adherencia a lo planificado',
        description: 'Solés cumplir las comidas agendadas con anticipación, lo que permite sugerencias más integradas.',
        evidenceCount: completedPlans,
        confidence: completedPlans >= 3 ? 'alta' : 'media',
        status: existing?.status || 'active',
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ruleKey,
        impactDescription: 'Mantiene alta coherencia entre el plan y las recomendaciones de Mi Cocina.',
        weightBonus: 0.05,
      });
    }

    return hypotheses;
  }

  /**
   * Calculates the affinity fit score (0.0 to 1.0, 0.5 is neutral) and reasons for a given recipe.
   */
  public calculateAffinityFit(
    recipe: Recipe,
    profile?: AffinityProfile
  ): { score: number; reasons: string[]; penalties: string[] } {
    // Cold start default
    if (!profile || (profile.signalsCount === 0 && profile.favoriteIngredients.length === 0 && profile.avoidedIngredients.length === 0)) {
      return { score: 0.5, reasons: [], penalties: [] };
    }

    let score = 0.5; // neutral baseline
    const reasons: string[] = [];
    const penalties: string[] = [];

    // 1. Avoided ingredients check (Hard penalty)
    const hasAvoided = recipe.ingredients.some((ing) =>
      profile.avoidedIngredients.some(
        (avoided) =>
          ing.name.toLowerCase().includes(avoided.toLowerCase()) ||
          avoided.toLowerCase().includes(ing.name.toLowerCase())
      )
    );

    if (hasAvoided) {
      score -= 0.35;
      penalties.push('Contiene ingredientes que configuraste para evitar.');
    }

    // 2. Favorite ingredients bonus
    const matchedFavs = recipe.ingredients
      .map((i) => i.name)
      .filter((name) =>
        profile.favoriteIngredients.some(
          (fav) =>
            name.toLowerCase().includes(fav.toLowerCase()) ||
            fav.toLowerCase().includes(name.toLowerCase())
        )
      );

    if (matchedFavs.length > 0) {
      score += Math.min(0.2, 0.1 * matchedFavs.length);
      reasons.push(`Incluye tus ingredientes preferidos (${matchedFavs.slice(0, 2).join(', ')}).`);
    }

    // 3. Learned tag affinities
    let tagBonus = 0;
    const positiveTags: string[] = [];
    recipe.tags.forEach((tag) => {
      const aff = profile.tagAffinities[tag.toLowerCase()];
      if (aff && aff > 0.2) {
        tagBonus += aff * 0.08;
        positiveTags.push(tag);
      } else if (aff && aff < -0.2) {
        tagBonus += aff * 0.08;
      }
    });

    if (tagBonus > 0) {
      score += Math.min(0.15, tagBonus);
      if (positiveTags.length > 0 && reasons.length === 0) {
        reasons.push(`Alineado con tus tipos de plato habituales (${positiveTags.slice(0, 2).join(', ')}).`);
      }
    } else if (tagBonus < 0) {
      score += Math.max(-0.15, tagBonus);
    }

    // 4. Recipe individual affinity bias
    if (profile.recipeAffinities[recipe.id]) {
      const rBias = profile.recipeAffinities[recipe.id];
      score += rBias;
      if (rBias > 0.15 && reasons.length === 0) {
        reasons.push('Plato con excelente aceptación en tus elecciones previas.');
      }
    }

    // 5. Check active hypotheses
    profile.hypotheses.forEach((hyp) => {
      if (hyp.status === 'dismissed_by_user' || hyp.status === 'paused') return;

      if (hyp.targetTag && recipe.tags.some((t) => t.toLowerCase() === hyp.targetTag?.toLowerCase())) {
        score += hyp.weightBonus;
      }
    });

    // Bound between 0.05 and 0.95 (Prudence: never 0 or 1 purely from affinity)
    const bounded = Math.max(0.05, Math.min(0.95, score));

    return {
      score: bounded,
      reasons: reasons.slice(0, 2),
      penalties: penalties.slice(0, 2),
    };
  }

  /**
   * Calculates contextual preference fit according to learned habits for specific moments/energy.
   */
  public calculateContextualPreferenceFit(
    recipe: Recipe,
    profile: AffinityProfile | undefined,
    context: UserContext
  ): { score: number; reasons: string[]; penalties: string[] } {
    if (!profile) return { score: 0.5, reasons: [], penalties: [] };

    let score = 0.5;
    const reasons: string[] = [];
    const penalties: string[] = [];

    // Active hypotheses affecting moment/energy
    profile.hypotheses.forEach((hyp) => {
      if (hyp.status === 'dismissed_by_user' || hyp.status === 'paused') return;

      // Lunch quick preference
      if (hyp.category === 'time_preference' && hyp.targetMoment === context.moment && context.moment === 'almuerzo') {
        if (recipe.prepTimeMinutes <= 20) {
          score += hyp.weightBonus;
          reasons.push('Coincide con tu preferencia habitual por almuerzos rápidos de ≤20 min.');
        } else if (recipe.prepTimeMinutes > 35) {
          score -= 0.08;
          penalties.push('Más largo de lo que solés elegir en el almuerzo.');
        }
      }

      // Low energy simple preference
      if (hyp.category === 'effort_preference' && context.energy === 'baja') {
        if (recipe.complexity === 'muy_baja' || recipe.complexity === 'baja') {
          score += hyp.weightBonus;
          reasons.push('Se ajusta a tu patrón de platos con mínimo esfuerzo cuando hay baja energía.');
        }
      }
    });

    const bounded = Math.max(0.1, Math.min(0.9, score));
    return {
      score: bounded,
      reasons: reasons.slice(0, 1),
      penalties: penalties.slice(0, 1),
    };
  }

  /**
   * Update hypothesis status by ID
   */
  public updateHypothesisStatus(
    hypotheses: LearningHypothesis[],
    id: string,
    newStatus: HypothesisStatus
  ): LearningHypothesis[] {
    return hypotheses.map((h) =>
      h.id === id ? { ...h, status: newStatus, updatedAt: new Date().toISOString() } : h
    );
  }

  /**
   * Toggle a favorite ingredient
   */
  public toggleFavoriteIngredient(profile: AffinityProfile, ingredientName: string): AffinityProfile {
    const trimmed = ingredientName.trim();
    if (!trimmed) return profile;

    const exists = profile.favoriteIngredients.some((i) => i.toLowerCase() === trimmed.toLowerCase());
    const newFavorites = exists
      ? profile.favoriteIngredients.filter((i) => i.toLowerCase() !== trimmed.toLowerCase())
      : [...profile.favoriteIngredients, trimmed];

    // Remove from avoided if added to favorites
    const newAvoided = profile.avoidedIngredients.filter((i) => i.toLowerCase() !== trimmed.toLowerCase());

    const updatedProfile: AffinityProfile = {
      ...profile,
      favoriteIngredients: newFavorites,
      avoidedIngredients: newAvoided,
      lastCalculatedAt: new Date().toISOString(),
    };

    // Re-generate hypotheses with updated ingredients
    updatedProfile.hypotheses = this.generateHypotheses(
      [],
      profile.hypotheses,
      profile.tagAffinities,
      newFavorites,
      newAvoided
    );

    return updatedProfile;
  }

  /**
   * Toggle an avoided ingredient
   */
  public toggleAvoidedIngredient(profile: AffinityProfile, ingredientName: string): AffinityProfile {
    const trimmed = ingredientName.trim();
    if (!trimmed) return profile;

    const exists = profile.avoidedIngredients.some((i) => i.toLowerCase() === trimmed.toLowerCase());
    const newAvoided = exists
      ? profile.avoidedIngredients.filter((i) => i.toLowerCase() !== trimmed.toLowerCase())
      : [...profile.avoidedIngredients, trimmed];

    // Remove from favorites if added to avoided
    const newFavorites = profile.favoriteIngredients.filter((i) => i.toLowerCase() !== trimmed.toLowerCase());

    const updatedProfile: AffinityProfile = {
      ...profile,
      favoriteIngredients: newFavorites,
      avoidedIngredients: newAvoided,
      lastCalculatedAt: new Date().toISOString(),
    };

    // Re-generate hypotheses with updated ingredients
    updatedProfile.hypotheses = this.generateHypotheses(
      [],
      profile.hypotheses,
      profile.tagAffinities,
      newFavorites,
      newAvoided
    );

    return updatedProfile;
  }
}

export const learningService = new LearningService();
