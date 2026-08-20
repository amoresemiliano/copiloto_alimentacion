import {
  ConversationIntent,
  ConversationIntentType,
  ConversationIngredientEntity,
  UserContext,
  InventoryItem,
  Recipe,
  LearningHypothesis,
  DietaryRestriction,
  MealMoment,
  HungerLevel,
  EnergyLevel,
  CookingTimeLimit,
  CookingMotivation,
  UserPriority,
  PlanDay,
  ConfidenceLevel,
  IngredientAvailability,
  IngredientPriority,
} from '../types/domain';

export interface ConversationInterpreter {
  interpret(
    rawMessage: string,
    currentContext: UserContext,
    inventory: InventoryItem[],
    recipes: Recipe[],
    hypotheses: LearningHypothesis[],
    dietaryRestrictions?: DietaryRestriction[]
  ): ConversationIntent;
}

export class LocalConversationInterpreter implements ConversationInterpreter {
  public interpret(
    rawMessage: string,
    currentContext: UserContext,
    inventory: InventoryItem[],
    recipes: Recipe[],
    hypotheses: LearningHypothesis[],
    dietaryRestrictions: DietaryRestriction[] = []
  ): ConversationIntent {
    const trimmed = rawMessage.trim();
    const normalized = trimmed
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // strip accents for flexible matching

    // 1. Check for Dietary Restrictions ("no puedo comer", "alergia", "intolerante", "prohibido")
    const restrictionIntent = this.tryParseDietaryRestriction(rawMessage, normalized);
    if (restrictionIntent) return restrictionIntent;

    // 2. Check for Permanent Dislikes ("no me gusta", "odio", "no soporto", "detesto")
    const permanentDislikeIntent = this.tryParsePermanentDislike(rawMessage, normalized);
    if (permanentDislikeIntent) return permanentDislikeIntent;

    // 3. Check for Contextual Dislikes ("hoy no quiero", "ahora no tengo ganas de", "esta noche sin")
    const contextualDislikeIntent = this.tryParseContextualDislike(rawMessage, normalized);
    if (contextualDislikeIntent) return contextualDislikeIntent;

    // 4. Check for Favorites ("me encanta", "me gusta mucho", "mi favorito es")
    const favoriteIntent = this.tryParseFavorite(rawMessage, normalized);
    if (favoriteIntent) return favoriteIntent;

    // 5. Check for Learning Feedback / Correction ("eso no es así", "no tengas en cuenta eso", "es correcto")
    const learningCorrectionIntent = this.tryParseLearningCorrection(rawMessage, normalized, hypotheses);
    if (learningCorrectionIntent) return learningCorrectionIntent;

    // 6. Check for Learning Query ("¿qué aprendiste de mí?", "¿qué patrones tengo?")
    const learningQueryIntent = this.tryParseLearningQuery(rawMessage, normalized);
    if (learningQueryIntent) return learningQueryIntent;

    // 7. Check for Explanation Request ("¿por qué me recomendás esto?", "¿por qué la tortilla?")
    const explanationIntent = this.tryParseExplanation(rawMessage, normalized, recipes);
    if (explanationIntent) return explanationIntent;

    // 8. Check for Free Meal Logging ("al final comí", "almorcé pizza", "cené ensalada")
    const mealLogIntent = this.tryParseMealLog(rawMessage, normalized);
    if (mealLogIntent) return mealLogIntent;

    // 9. Check for Planning Query or Actions ("¿qué tenía planeado?", "mañana quiero comer pasta")
    const planningIntent = this.tryParsePlanning(rawMessage, normalized, recipes);
    if (planningIntent) return planningIntent;

    // 10. Check for Shopping Query or Actions ("¿qué me falta comprar?", "ya compré huevos", "compré tomates")
    const shoppingIntent = this.tryParseShopping(rawMessage, normalized, inventory);
    if (shoppingIntent) return shoppingIntent;

    // 11. Check for Context Updates & Recommendation requests ("tengo 15 minutos", "¿qué puedo cenar rápido?", "tengo poca energía")
    const contextOrRecIntent = this.tryParseContextOrRecommendation(rawMessage, normalized, currentContext);
    if (contextOrRecIntent) return contextOrRecIntent;

    // 12. Check for Inventory Queries ("¿tengo arroz?", "¿qué hay en la heladera?", "¿qué se vence pronto?")
    const inventoryQueryIntent = this.tryParseInventoryQuery(rawMessage, normalized, inventory);
    if (inventoryQueryIntent) return inventoryQueryIntent;

    // 13. Check for Inventory Updates ("tengo pollo, tomate y queso", "no tengo huevos", "me queda poco arroz", "tengo bananas muy maduras")
    const inventoryUpdateIntent = this.tryParseInventoryUpdate(rawMessage, normalized, inventory);
    if (inventoryUpdateIntent) return inventoryUpdateIntent;

    // 14. Fallback if no intent matches with high confidence
    return {
      type: 'fallback_unknown',
      confidence: 0.1,
      rawMessage,
      entities: {},
      clarificationNeeded: true,
      clarificationPrompt: 'No estoy seguro de qué querés hacer. Podés pedirme ideas para comer, actualizar tu cocina, planificar o revisar compras.',
      proposedActionSummary: 'Ofrecer orientación sobre capacidades del sistema',
    };
  }

  // --------------------------------------------------------------------------
  // Parsers
  // --------------------------------------------------------------------------

  private tryParseDietaryRestriction(raw: string, norm: string): ConversationIntent | null {
    const restrictionPatterns = [
      /no puedo comer\s+([a-z0-9\s]+)/i,
      /alergico(?:\s+a)?\s+([a-z0-9\s]+)/i,
      /alergia(?:\s+al|\s+a\s+la|\s+a)?\s+([a-z0-9\s]+)/i,
      /intolerante(?:\s+al|\s+a\s+la|\s+a)?\s+([a-z0-9\s]+)/i,
      /prohibido(?:\s+el|\s+la|\s+los|\s+las)?\s+([a-z0-9\s]+)/i,
      /no debo comer\s+([a-z0-9\s]+)/i,
    ];

    for (const pattern of restrictionPatterns) {
      const match = norm.match(pattern);
      if (match && match[1]) {
        const item = match[1].replace(/^(el|la|los|las|un|una)\s+/, '').trim();
        return {
          type: 'set_preference',
          confidence: 0.95,
          rawMessage: raw,
          entities: {
            preferenceType: 'hard_restriction',
            preferenceValue: item,
          },
          proposedActionSummary: `Registrar restricción estricta: ${item}`,
        };
      }
    }
    return null;
  }

  private tryParsePermanentDislike(raw: string, norm: string): ConversationIntent | null {
    // Exclude if it has "hoy no quiero"
    if (norm.includes('hoy no') || norm.includes('ahora no')) return null;

    const dislikePatterns = [
      /no me gusta(?:\s+el|\s+la|\s+los|\s+las|\s+nada)?\s+([a-z0-9\s]+)/i,
      /odio(?:\s+el|\s+la|\s+los|\s+las)?\s+([a-z0-9\s]+)/i,
      /detesto(?:\s+el|\s+la|\s+los|\s+las)?\s+([a-z0-9\s]+)/i,
      /no soporto(?:\s+el|\s+la|\s+los|\s+las)?\s+([a-z0-9\s]+)/i,
    ];

    for (const pattern of dislikePatterns) {
      const match = norm.match(pattern);
      if (match && match[1]) {
        const item = match[1].replace(/^(el|la|los|las|un|una)\s+/, '').trim();
        return {
          type: 'set_preference',
          confidence: 0.9,
          rawMessage: raw,
          entities: {
            preferenceType: 'permanent_dislike',
            preferenceValue: item,
          },
          proposedActionSummary: `Evitar ingrediente en el aprendizaje: ${item}`,
        };
      }
    }
    return null;
  }

  private tryParseContextualDislike(raw: string, norm: string): ConversationIntent | null {
    const contextualPatterns = [
      /hoy no quiero(?:\s+comer|\s+cocinar)?\s+([a-z0-9\s]+)/i,
      /ahora no tengo ganas de(?:\s+comer)?\s+([a-z0-9\s]+)/i,
      /hoy sin\s+([a-z0-9\s]+)/i,
      /esta noche no quiero\s+([a-z0-9\s]+)/i,
      /este mediodia no quiero\s+([a-z0-9\s]+)/i,
      /hoy no me apetece\s+([a-z0-9\s]+)/i,
      /no tengo ganas de comer\s+([a-z0-9\s]+)\s+hoy/i,
      /no tengo ganas de comer\s+([a-z0-9\s]+)/i,
    ];

    for (const pattern of contextualPatterns) {
      const match = norm.match(pattern);
      if (match && match[1]) {
        const item = match[1].replace(/^(el|la|los|las|un|una)\s+/, '').replace(/\s+hoy$/, '').trim();
        return {
          type: 'set_preference',
          confidence: 0.88,
          rawMessage: raw,
          entities: {
            preferenceType: 'contextual_dislike',
            preferenceValue: item,
          },
          proposedActionSummary: `Excluir temporalmente en esta sesión: ${item}`,
        };
      }
    }
    return null;
  }

  private tryParseFavorite(raw: string, norm: string): ConversationIntent | null {
    const favPatterns = [
      /me encanta(?:\s+el|\s+la|\s+los|\s+las)?\s+([a-z0-9\s]+)/i,
      /me gusta mucho(?:\s+el|\s+la|\s+los|\s+las)?\s+([a-z0-9\s]+)/i,
      /mi favorito es(?:\s+el|\s+la|\s+los|\s+las)?\s+([a-z0-9\s]+)/i,
      /amo(?:\s+el|\s+la|\s+los|\s+las)?\s+([a-z0-9\s]+)/i,
    ];

    for (const pattern of favPatterns) {
      const match = norm.match(pattern);
      if (match && match[1]) {
        const item = match[1].replace(/^(el|la|los|las|un|una)\s+/, '').trim();
        return {
          type: 'set_preference',
          confidence: 0.9,
          rawMessage: raw,
          entities: {
            preferenceType: 'favorite',
            preferenceValue: item,
          },
          proposedActionSummary: `Agregar a favoritos: ${item}`,
        };
      }
    }
    return null;
  }

  private tryParseLearningCorrection(
    raw: string,
    norm: string,
    hypotheses: LearningHypothesis[]
  ): ConversationIntent | null {
    const dismissWords = [
      'eso no es asi',
      'no es asi',
      'no tengas en cuenta eso',
      'no es verdad',
      'eso esta mal',
      'descartar hipotesis',
      'no suelo hacer eso',
      'no es mi patron',
      'rechazar hipotesis',
    ];

    const confirmWords = [
      'es correcto',
      'si es correcto',
      'tal cual',
      'exacto',
      'confirmar hipotesis',
      'si confirmo',
      'es verdad',
      'eso es asi',
    ];

    for (const phrase of dismissWords) {
      if (norm.includes(phrase)) {
        const firstActive = hypotheses.find((h) => h.status === 'active' || h.status === 'confirmed_by_user');
        return {
          type: 'correct_learning',
          confidence: 0.9,
          rawMessage: raw,
          entities: {
            hypothesisFeedback: 'dismiss',
            hypothesisId: firstActive?.id,
          },
          proposedActionSummary: firstActive
            ? `Descartar hipótesis "${firstActive.title}"`
            : 'Descartar hipótesis reciente',
        };
      }
    }

    for (const phrase of confirmWords) {
      if (norm.includes(phrase)) {
        const firstActive = hypotheses.find((h) => h.status === 'active');
        return {
          type: 'correct_learning',
          confidence: 0.9,
          rawMessage: raw,
          entities: {
            hypothesisFeedback: 'confirm',
            hypothesisId: firstActive?.id,
          },
          proposedActionSummary: firstActive
            ? `Confirmar hipótesis "${firstActive.title}"`
            : 'Confirmar hipótesis activa',
        };
      }
    }

    return null;
  }

  private tryParseLearningQuery(raw: string, norm: string): ConversationIntent | null {
    const patterns = [
      'que aprendiste de mi',
      'que aprendiste',
      'que sabes de mi',
      'cuales son mis habitos',
      'mis patrones',
      'que patrones',
      'que sabes de mis comidas',
    ];

    if (patterns.some((p) => norm.includes(p))) {
      return {
        type: 'query_learning',
        confidence: 0.92,
        rawMessage: raw,
        entities: {},
        proposedActionSummary: 'Consultar perfil de aprendizaje y patrones detectados',
      };
    }
    return null;
  }

  private tryParseExplanation(raw: string, norm: string, recipes: Recipe[]): ConversationIntent | null {
    const patterns = [
      /por que me recomendas esto/i,
      /por que me recomendas/i,
      /por que esta primera/i,
      /por que elegiste/i,
      /por que la ([a-z0-9\s]+)/i,
      /por que el ([a-z0-9\s]+)/i,
    ];

    for (const pattern of patterns) {
      if (pattern.test(norm)) {
        let recipeId: string | undefined;
        let recipeName: string | undefined;

        // Try to identify if user named a specific recipe
        for (const r of recipes) {
          const rNorm = r.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const words = rNorm.split(/\s+/).filter((w) => w.length > 3);
          if (words.some((w) => norm.includes(w))) {
            recipeId = r.id;
            recipeName = r.name;
            break;
          }
        }

        return {
          type: 'explain_recommendation',
          confidence: 0.88,
          rawMessage: raw,
          entities: {
            recipeId,
            recipeName,
          },
          proposedActionSummary: recipeName
            ? `Explicar por qué se recomienda "${recipeName}"`
            : 'Explicar factores de la recomendación principal',
        };
      }
    }
    return null;
  }

  private tryParseMealLog(raw: string, norm: string): ConversationIntent | null {
    const logPatterns = [
      /al final comi\s+([a-z0-9\s,y]+)/i,
      /al final almorce\s+([a-z0-9\s,y]+)/i,
      /al final cene\s+([a-z0-9\s,y]+)/i,
      /comi\s+([a-z0-9\s,y]+)/i,
      /almorce\s+([a-z0-9\s,y]+)/i,
      /cene\s+([a-z0-9\s,y]+)/i,
      /desayune\s+([a-z0-9\s,y]+)/i,
      /merende\s+([a-z0-9\s,y]+)/i,
      /registra que comi\s+([a-z0-9\s,y]+)/i,
    ];

    for (const pattern of logPatterns) {
      const match = norm.match(pattern);
      if (match && match[1]) {
        let moment: MealMoment = 'almuerzo';
        if (norm.includes('cene') || norm.includes('cena')) moment = 'cena';
        else if (norm.includes('almorce') || norm.includes('almuerzo')) moment = 'almuerzo';
        else if (norm.includes('desayune') || norm.includes('desayuno')) moment = 'desayuno';
        else if (norm.includes('merende') || norm.includes('merienda')) moment = 'merienda';

        const mealText = match[1].trim();

        return {
          type: 'log_real_meal',
          confidence: 0.9,
          rawMessage: raw,
          entities: {
            mealText,
            moment,
          },
          proposedActionSummary: `Registrar comida real consumida: "${mealText}" (${moment})`,
        };
      }
    }
    return null;
  }

  private tryParsePlanning(raw: string, norm: string, recipes: Recipe[]): ConversationIntent | null {
    // Planning Query
    if (
      norm.includes('que tenia planeado') ||
      norm.includes('que tengo planeado') ||
      norm.includes('que hay para cenar hoy') ||
      norm.includes('que hay planeado') ||
      norm.includes('mostrame el plan') ||
      norm.includes('ver plan')
    ) {
      let day: PlanDay = 'manana';
      if (norm.includes('hoy')) day = 'hoy';
      else if (norm.includes('proximos')) day = 'proximos_dias';

      return {
        type: 'query_planning',
        confidence: 0.9,
        rawMessage: raw,
        entities: {
          planDay: day,
        },
        proposedActionSummary: `Consultar comidas planificadas para ${day}`,
      };
    }

    // Plan a meal
    const planPatterns = [
      /manana quiero comer\s+([a-z0-9\s]+)/i,
      /guarda esto para la cena de manana/i,
      /guarda esto para manana/i,
      /planifica(?:r)?\s+([a-z0-9\s]+)\s+para manana/i,
      /planifica(?:r)?\s+([a-z0-9\s]+)\s+para hoy/i,
      /quiero planificar\s+([a-z0-9\s]+)/i,
    ];

    for (const pattern of planPatterns) {
      const match = norm.match(pattern);
      if (match) {
        const dishOrTarget = match[1] ? match[1].trim() : 'plato sugerido';
        const day: PlanDay = norm.includes('hoy') ? 'hoy' : 'manana';
        const moment: MealMoment = norm.includes('cena') || norm.includes('cenar') ? 'cena' : 'almuerzo';

        // Check if matches known recipe
        const matchedRecipe = recipes.find((r) => {
          const rNorm = r.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return rNorm.includes(dishOrTarget) || dishOrTarget.includes(rNorm);
        });

        return {
          type: 'plan_meal',
          confidence: 0.88,
          rawMessage: raw,
          entities: {
            recipeName: matchedRecipe ? matchedRecipe.name : dishOrTarget,
            recipeId: matchedRecipe?.id,
            planDay: day,
            moment,
          },
          proposedActionSummary: `Planificar "${matchedRecipe ? matchedRecipe.name : dishOrTarget}" para ${day} (${moment})`,
        };
      }
    }

    return null;
  }

  private tryParseShopping(raw: string, norm: string, inventory: InventoryItem[]): ConversationIntent | null {
    // Shopping Query
    if (
      norm.includes('que me falta comprar') ||
      norm.includes('que tengo que comprar') ||
      norm.includes('que me falta') ||
      norm.includes('mostrame la lista') ||
      norm.includes('lista de compras') ||
      norm.includes('voy al super') ||
      norm.includes('voy al supermercado')
    ) {
      return {
        type: 'query_shopping',
        confidence: 0.92,
        rawMessage: raw,
        entities: {},
        proposedActionSummary: 'Consultar lista de compras y necesidades pendientes',
      };
    }

    // Shopping Update / Purchase ("Ya compré huevos y tomates", "Compré pollo y bananas")
    if (norm.startsWith('ya compre') || norm.startsWith('compre ') || norm.includes('compramos ')) {
      const itemsText = norm
        .replace(/^(ya compre|compre|compramos)\s+/, '')
        .replace(/\.$/, '')
        .trim();

      const itemNames = this.splitItemsList(itemsText);
      const isUncertain = this.hasUncertainty(norm);

      const ingredients: ConversationIngredientEntity[] = itemNames.map((name) => ({
        name: this.cleanIngredientName(name),
        action: 'add',
        status: 'tengo',
        confidence: isUncertain ? 'uncertain' : 'confirmed',
      }));

      return {
        type: 'update_shopping',
        confidence: 0.9,
        rawMessage: raw,
        entities: {
          shoppingItemNames: itemNames.map((n) => this.cleanIngredientName(n)),
          ingredients,
          uncertainty: isUncertain,
        },
        proposedActionSummary: `Registrar compra y actualizar inventario: ${ingredients.map((i) => i.name).join(', ')}`,
      };
    }

    // Remove from shopping ("sacá arroz de la lista")
    if (norm.includes('saca ') || norm.includes('elimina ') || norm.includes('borra ')) {
      if (norm.includes('lista') || norm.includes('compras')) {
        const cleaned = norm
          .replace(/.*(saca|elimina|borra)\s+/, '')
          .replace(/de la lista.*/, '')
          .trim();
        return {
          type: 'update_shopping',
          confidence: 0.85,
          rawMessage: raw,
          entities: {
            shoppingItemNames: [this.cleanIngredientName(cleaned)],
          },
          proposedActionSummary: `Quitar de la lista de compras: ${cleaned}`,
        };
      }
    }

    return null;
  }

  private tryParseInventoryQuery(raw: string, norm: string, inventory: InventoryItem[]): ConversationIntent | null {
    // Check specific queries like "qué se vence pronto", "qué tengo para usar pronto"
    if (
      norm.includes('usar pronto') ||
      norm.includes('vence pronto') ||
      norm.includes('maduras') ||
      norm.includes('prioritario') ||
      norm.includes('aprovechar')
    ) {
      return {
        type: 'query_inventory',
        confidence: 0.9,
        rawMessage: raw,
        entities: {
          queryTarget: 'expiring_soon',
        },
        proposedActionSummary: 'Consultar ingredientes que conviene consumir pronto',
      };
    }

    // General fridge/kitchen query
    if (
      norm.includes('que hay en la heladera') ||
      norm.includes('que hay en la cocina') ||
      norm.includes('que ingredientes tengo') ||
      norm.includes('que tengo en casa') ||
      norm.includes('mostrame mi cocina') ||
      norm.includes('ver inventario')
    ) {
      return {
        type: 'query_inventory',
        confidence: 0.9,
        rawMessage: raw,
        entities: {
          queryTarget: 'general',
        },
        proposedActionSummary: 'Consultar estado general del inventario',
      };
    }

    // Specific item check: "¿tengo arroz?", "¿hay huevos?"
    const checkPatterns = [
      /tengo\s+([a-z0-9\s]+)\?/i,
      /hay\s+([a-z0-9\s]+)\?/i,
      /me queda\s+([a-z0-9\s]+)\?/i,
      /tengo\s+([a-z0-9\s]+)$/i,
    ];

    for (const pattern of checkPatterns) {
      const match = norm.match(pattern);
      if (match && match[1] && (raw.includes('?') || norm.startsWith('tengo') || norm.startsWith('hay'))) {
        const cleanTarget = this.cleanIngredientName(match[1]);
        // Ignore if it looks like a context declaration like "tengo mucha hambre"
        if (['mucha hambre', 'hambre', 'poca energia', 'tiempo', '15 minutos', '20 minutos', 'ganas'].includes(cleanTarget)) {
          return null;
        }

        return {
          type: 'query_inventory',
          confidence: 0.88,
          rawMessage: raw,
          entities: {
            ingredients: [{ name: cleanTarget }],
            queryTarget: 'general',
          },
          proposedActionSummary: `Consultar disponibilidad de "${cleanTarget}" en inventario`,
        };
      }
    }

    return null;
  }

  private tryParseInventoryUpdate(raw: string, norm: string, inventory: InventoryItem[]): ConversationIntent | null {
    const isUncertain = this.hasUncertainty(norm);

    // 1. "Tengo bananas muy maduras" / "me quedan dos bananas y están muy maduras"
    if (norm.includes('madur') || norm.includes('usar pronto') || norm.includes('por vencer')) {
      const cleaned = norm
        .replace(/.*(tengo|me quedan|quedan)\s+/, '')
        .replace(/\s+(y|que)?\s*(estan|muy|maduras|maduros|por vencer|para usar pronto).*/, '')
        .trim();

      const items = this.splitItemsList(cleaned);
      const ingredients: ConversationIngredientEntity[] = items.map((name) => ({
        name: this.cleanIngredientName(name),
        status: 'tengo',
        priority: 'consumir_pronto',
        confidence: isUncertain ? 'uncertain' : 'confirmed',
      }));

      return {
        type: 'update_inventory',
        confidence: 0.9,
        rawMessage: raw,
        entities: {
          ingredients,
          uncertainty: isUncertain,
        },
        proposedActionSummary: `Marcar como prioritario para consumir pronto: ${ingredients.map((i) => i.name).join(', ')}`,
      };
    }

    // 2. "No tengo huevos" / "Se me terminó el arroz" / "No me queda leche"
    if (
      norm.startsWith('no tengo ') ||
      norm.startsWith('se me termino ') ||
      norm.startsWith('se termino ') ||
      norm.startsWith('no queda ') ||
      norm.startsWith('no me queda ')
    ) {
      const cleaned = norm
        .replace(/^(no tengo|se me termino el|se me termino la|se me termino|se termino|no queda|no me queda el|no me queda la|no me queda)\s+/, '')
        .trim();

      const items = this.splitItemsList(cleaned);
      const ingredients: ConversationIngredientEntity[] = items.map((name) => ({
        name: this.cleanIngredientName(name),
        status: 'no_tengo',
        confidence: isUncertain ? 'uncertain' : 'confirmed',
      }));

      return {
        type: 'update_inventory',
        confidence: 0.9,
        rawMessage: raw,
        entities: {
          ingredients,
          uncertainty: isUncertain,
        },
        proposedActionSummary: `Marcar como no disponible (agotado): ${ingredients.map((i) => i.name).join(', ')}`,
      };
    }

    // 3. "Me queda poco arroz" / "Tengo poco queso"
    if (norm.includes('queda poco ') || norm.includes('tengo poco ') || norm.includes('tengo poca ')) {
      const cleaned = norm
        .replace(/.*(queda poco|tengo poco|tengo poca)\s+(de\s+)?(el\s+|la\s+|los\s+|las\s+)?/, '')
        .trim();

      const items = this.splitItemsList(cleaned);
      const ingredients: ConversationIngredientEntity[] = items.map((name) => ({
        name: this.cleanIngredientName(name),
        status: 'queda_poco',
        confidence: isUncertain ? 'uncertain' : 'confirmed',
      }));

      return {
        type: 'update_inventory',
        confidence: 0.9,
        rawMessage: raw,
        entities: {
          ingredients,
          uncertainty: isUncertain,
        },
        proposedActionSummary: `Marcar estado como "Queda poco": ${ingredients.map((i) => i.name).join(', ')}`,
      };
    }

    // 4. "Tengo pollo, tomate, queso y huevos." / "Creo que me queda arroz"
    if (
      norm.startsWith('tengo ') ||
      norm.startsWith('creo que tengo ') ||
      norm.startsWith('creo que me queda ') ||
      norm.startsWith('me queda ') ||
      norm.startsWith('en casa hay ')
    ) {
      // Check that this is not context like "tengo mucha hambre" or "tengo 15 minutos"
      if (
        norm.includes('hambre') ||
        norm.includes('energia') ||
        norm.includes('minutos') ||
        norm.includes('tiempo') ||
        norm.includes('ganas de cocinar')
      ) {
        return null;
      }

      const cleaned = norm
        .replace(/^(creo que tengo|creo que me queda|tengo|me queda|en casa hay)\s+/, '')
        .trim();

      const items = this.splitItemsList(cleaned);
      const ingredients: ConversationIngredientEntity[] = items.map((name) => ({
        name: this.cleanIngredientName(name),
        status: 'tengo',
        confidence: isUncertain ? 'uncertain' : 'confirmed',
      }));

      if (ingredients.length > 0 && ingredients[0].name.length > 1) {
        return {
          type: 'update_inventory',
          confidence: isUncertain ? 0.75 : 0.9,
          rawMessage: raw,
          entities: {
            ingredients,
            uncertainty: isUncertain,
          },
          proposedActionSummary: isUncertain
            ? `Registrar con incertidumbre: ${ingredients.map((i) => i.name).join(', ')} (marcado como tentativa)`
            : `Actualizar stock disponible: ${ingredients.map((i) => i.name).join(', ')}`,
        };
      }
    }

    return null;
  }

  private tryParseContextOrRecommendation(
    raw: string,
    norm: string,
    currentContext: UserContext
  ): ConversationIntent | null {
    let hasContextEntity = false;
    const entities: ConversationIntent['entities'] = {};

    // 1. Hunger
    if (norm.includes('mucha hambre') || norm.includes('muerto de hambre') || norm.includes('moriendo de hambre') || norm.includes('super hambre')) {
      entities.hunger = 'mucha';
      hasContextEntity = true;
    } else if (norm.includes('poca hambre') || norm.includes('algo liviano') || norm.includes('algo ligero') || norm.includes('no tengo tanta hambre')) {
      entities.hunger = 'poca';
      hasContextEntity = true;
    } else if (norm.includes('hambre normal')) {
      entities.hunger = 'normal';
      hasContextEntity = true;
    }

    // 2. Energy
    if (
      norm.includes('poca energia') ||
      norm.includes('sin energia') ||
      norm.includes('cansado') ||
      norm.includes('cansada') ||
      norm.includes('agotado') ||
      norm.includes('reventado') ||
      norm.includes('no doy mas')
    ) {
      entities.energy = 'baja';
      hasContextEntity = true;
    } else if (norm.includes('mucha energia') || norm.includes('con energia') || norm.includes('a pleno')) {
      entities.energy = 'alta';
      hasContextEntity = true;
    }

    // 3. Time limit
    if (
      norm.includes('15 minutos') ||
      norm.includes('15 min') ||
      norm.includes('10 minutos') ||
      norm.includes('15m') ||
      norm.includes('10m') ||
      norm.includes('no quiero cocinar mas de 15') ||
      norm.includes('nada de tiempo')
    ) {
      entities.timeLimit = '15min';
      hasContextEntity = true;
    } else if (
      norm.includes('30 minutos') ||
      norm.includes('30 min') ||
      norm.includes('media hora') ||
      norm.includes('20 minutos') ||
      norm.includes('25 minutos')
    ) {
      entities.timeLimit = '30min';
      hasContextEntity = true;
    } else if (norm.includes('tengo tiempo') || norm.includes('sin apuro') || norm.includes('bastante tiempo')) {
      entities.timeLimit = 'tengo_tiempo';
      hasContextEntity = true;
    }

    // 4. Motivation
    if (
      norm.includes('no quiero cocinar') ||
      norm.includes('cero ganas de cocinar') ||
      norm.includes('sin ganas de cocinar') ||
      norm.includes('minimas ganas')
    ) {
      entities.motivation = 'minimas';
      hasContextEntity = true;
    } else if (norm.includes('tengo ganas de cocinar') || norm.includes('con ganas de cocinar')) {
      entities.motivation = 'tengo_ganas';
      hasContextEntity = true;
    }

    // 5. Moment
    if (norm.includes('cenar') || norm.includes('cena') || norm.includes('esta noche')) {
      entities.moment = 'cena';
      hasContextEntity = true;
    } else if (norm.includes('almorzar') || norm.includes('almuerzo') || norm.includes('este mediodia')) {
      entities.moment = 'almuerzo';
      hasContextEntity = true;
    } else if (norm.includes('desayunar') || norm.includes('desayuno')) {
      entities.moment = 'desayuno';
      hasContextEntity = true;
    } else if (norm.includes('merendar') || norm.includes('merienda')) {
      entities.moment = 'merienda';
      hasContextEntity = true;
    }

    // 6. Priority
    if (norm.includes('algo rapido') || norm.includes('rapido') || norm.includes('lo mas rapido')) {
      entities.priority = 'rapido';
      hasContextEntity = true;
    } else if (norm.includes('algo rico') || norm.includes('muy rico')) {
      entities.priority = 'algo_rico';
      hasContextEntity = true;
    } else if (norm.includes('usar lo que tengo') || norm.includes('aprovechar')) {
      entities.priority = 'usar_lo_que_tengo';
      hasContextEntity = true;
    } else if (norm.includes('saludable') || norm.includes('sano')) {
      entities.priority = 'mas_saludable';
      hasContextEntity = true;
    } else if (norm.includes('economico') || norm.includes('barato')) {
      entities.priority = 'economico';
      hasContextEntity = true;
    }

    // Is it explicitly a question asking for recommendations?
    const isRecommendationQuery =
      norm.includes('que como') ||
      norm.includes('que puedo comer') ||
      norm.includes('que ceno') ||
      norm.includes('que puedo cenar') ||
      norm.includes('que almuerzo') ||
      norm.includes('que puedo almorzar') ||
      norm.includes('dame algo') ||
      norm.includes('que preparo') ||
      norm.includes('sugerime') ||
      norm.includes('ideas para') ||
      norm.includes('que me recomendas');

    if (isRecommendationQuery) {
      return {
        type: 'get_recommendations',
        confidence: 0.95,
        rawMessage: raw,
        entities,
        proposedActionSummary: 'Calcular y rankear recomendaciones con el motor determinístico',
      };
    }

    if (hasContextEntity) {
      return {
        type: 'update_context',
        confidence: 0.9,
        rawMessage: raw,
        entities,
        proposedActionSummary: 'Actualizar contexto de la sesión y recalcular recomendaciones',
      };
    }

    return null;
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private splitItemsList(text: string): string[] {
    return text
      .split(/,|\s+y\s+|\s+e\s+|\s+con\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  private cleanIngredientName(name: string): string {
    return name
      .replace(/^(el|la|los|las|un|una|unos|unas|dos|tres|cuatro|poco|poca|algo de|de)\s+/i, '')
      .replace(/\s+(frescos|maduros|maduras|congelados|en lata|frescas)$/i, '')
      .replace(/[\.\,\?\!]/g, '')
      .trim();
  }

  private hasUncertainty(norm: string): boolean {
    return (
      norm.includes('creo que') ||
      norm.includes('parece que') ||
      norm.includes('tal vez') ||
      norm.includes('quizas') ||
      norm.includes('no estoy seguro') ||
      norm.includes('capaz')
    );
  }
}

export const localConversationInterpreter = new LocalConversationInterpreter();
