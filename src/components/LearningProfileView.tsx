import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Brain,
  Sparkles,
  Check,
  X,
  RotateCcw,
  Heart,
  Ban,
  Info,
  ShieldCheck,
  Activity,
  Plus,
} from 'lucide-react';
import { HypothesisStatus } from '../types/domain';

export const LearningProfileView: React.FC = () => {
  const {
    affinityProfile,
    behavioralSignals,
    updateHypothesisStatus,
    toggleFavoriteIngredient,
    toggleAvoidedIngredient,
    resetLearningProfile,
    recentMeals,
  } = useApp();

  const [newFavInput, setNewFavInput] = useState('');
  const [newAvoidInput, setNewAvoidInput] = useState('');
  const [showSignalInspector, setShowSignalInspector] = useState(false);

  const handleAddFavorite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFavInput.trim()) return;
    toggleFavoriteIngredient(newFavInput.trim());
    setNewFavInput('');
  };

  const handleAddAvoided = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAvoidInput.trim()) return;
    toggleAvoidedIngredient(newAvoidInput.trim());
    setNewAvoidInput('');
  };

  const hypotheses = affinityProfile.hypotheses || [];
  const favoriteIngredients = affinityProfile.favoriteIngredients || [];
  const avoidedIngredients = affinityProfile.avoidedIngredients || [];

  // Spontaneous vs planned
  const suggestedCount = recentMeals.filter((m) => m.wasSuggested).length;
  const spontaneousRate =
    recentMeals.length > 0 ? Math.round(((recentMeals.length - suggestedCount) / recentMeals.length) * 100) : 50;

  return (
    <div id="learning-profile-view" className="space-y-6 animate-fadeIn">
      {/* Overview Banner */}
      <div className="bg-gradient-to-br from-white to-[#FAF9F6] p-5 sm:p-6 rounded-3xl border border-[#E5E5E3] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FFF2EB] text-[#FF6321] border border-[#FFD9C6] flex items-center justify-center shrink-0 mt-0.5">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-[#1A1A1A] tracking-tight">
                  Aprendiendo de tus hábitos
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
                  Determinístico
                </span>
              </div>
              <p className="text-xs text-[#666666] mt-1 max-w-xl leading-relaxed">
                El sistema detecta patrones recurrentes en tus comidas, tiempos y elecciones reales para refinar las recomendaciones de forma prudente. 
                <strong className="text-[#1A1A1A]"> Vos siempre tenés la última palabra</strong>: podés confirmar, descartar o corregir cualquier hipótesis.
              </p>
            </div>
          </div>

          <button
            onClick={resetLearningProfile}
            className="text-[11px] font-bold text-[#8C8C8C] hover:text-[#D32F2F] bg-white hover:bg-[#FFEBEE] px-3 py-2 rounded-xl border border-[#E5E5E3] hover:border-[#FFCDD2] transition-colors flex items-center gap-1.5 shrink-0 self-start cursor-pointer"
            title="Borrar memoria de aprendizaje y restaurar estado neutro"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer aprendizaje</span>
          </button>
        </div>

        {/* Behavioral Metrics Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-5 border-t border-[#F0F0F0]">
          <div className="bg-white p-3 rounded-2xl border border-[#EBEBEA]">
            <span className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider block">
              Señales registradas
            </span>
            <span className="text-lg font-black text-[#1A1A1A] mt-0.5 block">
              {behavioralSignals.length}
            </span>
            <span className="text-[10px] text-[#666666]">eventos acumulados</span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-[#EBEBEA]">
            <span className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider block">
              Estilo de comida
            </span>
            <span className="text-lg font-black text-[#FF6321] mt-0.5 block">
              {spontaneousRate}% espontáneo
            </span>
            <span className="text-[10px] text-[#666666]">
              {100 - spontaneousRate}% sugerido
            </span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-[#EBEBEA]">
            <span className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider block">
              Hipótesis activas
            </span>
            <span className="text-lg font-black text-[#1A1A1A] mt-0.5 block">
              {hypotheses.filter((h) => h.status !== 'dismissed_by_user').length}
            </span>
            <span className="text-[10px] text-[#666666]">
              {hypotheses.filter((h) => h.status === 'confirmed_by_user').length} confirmadas
            </span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-[#EBEBEA]">
            <span className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider block">
              Ingredientes clave
            </span>
            <span className="text-lg font-black text-[#1A1A1A] mt-0.5 block">
              {favoriteIngredients.length} favs
            </span>
            <span className="text-[10px] text-[#666666]">
              {avoidedIngredients.length} evitados
            </span>
          </div>
        </div>
      </div>

      {/* Hypotheses Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black text-[#1A1A1A] tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#FF6321]" />
              <span>Hipótesis de comportamiento detectadas</span>
            </h4>
            <p className="text-[11px] text-[#666666]">
              Patrones identificados por el motor a partir de tu actividad. Ajustá su estado según tu realidad:
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {hypotheses.length > 0 ? (
            hypotheses.map((hypothesis) => {
              const isConfirmed = hypothesis.status === 'confirmed_by_user';
              const isDismissed = hypothesis.status === 'dismissed_by_user';

              return (
                <div
                  key={hypothesis.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isConfirmed
                      ? 'bg-[#F4FBF7] border-[#C8E6C9]'
                      : isDismissed
                      ? 'bg-[#FAFAFA] border-[#E5E5E3] opacity-60'
                      : 'bg-white border-[#E5E5E3] shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isConfirmed
                              ? 'bg-[#E8F5E9] text-[#2E7D32]'
                              : isDismissed
                              ? 'bg-[#EEEEEE] text-[#757575]'
                              : 'bg-[#FFF2EB] text-[#FF6321]'
                          }`}
                        >
                          {isConfirmed ? 'Confirmada por vos' : isDismissed ? 'Descartada' : 'Hipótesis tentativa'}
                        </span>

                        <span className="text-[10px] font-semibold text-[#8C8C8C] flex items-center gap-1">
                          <Activity className="w-3 h-3 text-[#FF6321]" />
                          Confianza {hypothesis.confidence} ({hypothesis.evidenceCount} evidencias)
                        </span>
                      </div>

                      <h5 className="text-sm font-bold text-[#1A1A1A]">
                        {hypothesis.title}
                      </h5>

                      <p className="text-xs text-[#666666] leading-snug">
                        {hypothesis.description}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {!isConfirmed && (
                        <button
                          onClick={() => updateHypothesisStatus(hypothesis.id, 'confirmed_by_user')}
                          className="px-3 py-1.5 rounded-xl bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[#2E7D32] text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          title="Confirmar: 'Es exactamente así, priorizalo'"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirmar</span>
                        </button>
                      )}

                      {!isDismissed && (
                        <button
                          onClick={() => updateHypothesisStatus(hypothesis.id, 'dismissed_by_user')}
                          className="px-3 py-1.5 rounded-xl bg-[#F5F5F4] hover:bg-[#FFEBEE] text-[#666666] hover:text-[#D32F2F] text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          title="Descartar: 'No es mi patrón real'"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Descartar</span>
                        </button>
                      )}

                      {(isConfirmed || isDismissed) && (
                        <button
                          onClick={() => updateHypothesisStatus(hypothesis.id, 'active')}
                          className="px-2.5 py-1.5 rounded-xl bg-[#F0F0F0] text-[#666666] hover:text-[#1A1A1A] text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Volver a estado tentativo de evaluación"
                        >
                          Reevaluar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-[#8C8C8C] bg-white rounded-2xl border border-[#E5E5E3]">
              Aún no hay suficientes registros para inferir hipótesis. A medida que uses la app, aparecerán patrones aquí.
            </div>
          )}
        </div>
      </div>

      {/* Explicit User Preferences (Favorites & Avoided) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Favorite Ingredients */}
        <div className="bg-white p-4.5 rounded-3xl border border-[#E5E5E3] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#FBE9E7] text-[#D84315] flex items-center justify-center">
                <Heart className="w-3.5 h-3.5 fill-current" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#1A1A1A] uppercase tracking-wider">
                  Ingredientes Preferidos
                </h4>
                <span className="text-[10px] text-[#666666]">Bonus positivo en el ranking (+15%)</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleAddFavorite} className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: Palta, Espinaca, Ajo..."
              value={newFavInput}
              onChange={(e) => setNewFavInput(e.target.value)}
              className="flex-1 text-xs bg-[#FAF9F6] border border-[#E5E5E3] rounded-xl px-3 py-2 focus:outline-none focus:border-[#FF6321]"
            />
            <button
              type="submit"
              className="bg-[#1A1A1A] hover:bg-black text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Agregar</span>
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {favoriteIngredients.length > 0 ? (
              favoriteIngredients.map((ing) => (
                <span
                  key={ing}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FFF2EB] text-[#FF6321] border border-[#FFD9C6]"
                >
                  <Heart className="w-3 h-3 fill-current" />
                  <span>{ing}</span>
                  <button
                    type="button"
                    onClick={() => toggleFavoriteIngredient(ing)}
                    className="hover:text-[#D32F2F] ml-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-[11px] text-[#8C8C8C] italic">
                Ningún ingrediente favorito cargado aún.
              </span>
            )}
          </div>
        </div>

        {/* Avoided Ingredients */}
        <div className="bg-white p-4.5 rounded-3xl border border-[#E5E5E3] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#FFEBEE] text-[#C62828] flex items-center justify-center">
                <Ban className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#1A1A1A] uppercase tracking-wider">
                  Ingredientes Evitados
                </h4>
                <span className="text-[10px] text-[#666666]">Penalización severa en el ranking (-40%)</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleAddAvoided} className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: Cilantro, Cebolla morada..."
              value={newAvoidInput}
              onChange={(e) => setNewAvoidInput(e.target.value)}
              className="flex-1 text-xs bg-[#FAF9F6] border border-[#E5E5E3] rounded-xl px-3 py-2 focus:outline-none focus:border-[#D32F2F]"
            />
            <button
              type="submit"
              className="bg-[#1A1A1A] hover:bg-black text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Evitar</span>
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {avoidedIngredients.length > 0 ? (
              avoidedIngredients.map((ing) => (
                <span
                  key={ing}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]"
                >
                  <Ban className="w-3 h-3" />
                  <span>{ing}</span>
                  <button
                    type="button"
                    onClick={() => toggleAvoidedIngredient(ing)}
                    className="hover:text-black ml-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-[11px] text-[#8C8C8C] italic">
                Ningún ingrediente restringido manualmente.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Signal Inspector Toggle */}
      <div className="bg-white rounded-2xl border border-[#E5E5E3] p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
            <span className="text-xs font-bold text-[#1A1A1A]">
              Trazabilidad y Transparencia del Aprendizaje ({behavioralSignals.length} señales)
            </span>
          </div>
          <button
            onClick={() => setShowSignalInspector(!showSignalInspector)}
            className="text-xs font-bold text-[#FF6321] hover:underline cursor-pointer"
          >
            {showSignalInspector ? 'Ocultar registro de señales' : 'Ver detalle de señales'}
          </button>
        </div>

        {showSignalInspector && (
          <div className="mt-3 pt-3 border-t border-[#F0F0F0] space-y-2 max-h-60 overflow-y-auto pr-1">
            {behavioralSignals.slice(0, 15).map((sig) => (
              <div
                key={sig.id}
                className="p-2 bg-[#FAF9F6] rounded-xl border border-[#EBEBEA] flex items-center justify-between text-[11px]"
              >
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-md font-bold uppercase text-[9px] bg-[#E8F5E9] text-[#2E7D32]">
                    {sig.type}
                  </span>
                  <span className="font-bold text-[#1A1A1A]">{sig.recipeName || sig.type}</span>
                  <span className="text-[#8C8C8C]">({sig.source})</span>
                </div>
                <div className="text-[#666666] font-mono text-[10px]">
                  Peso: {sig.weight.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Explanatory Footer */}
      <div className="bg-[#FAF9F6] p-4 rounded-3xl text-xs text-[#666666] border border-[#E5E5E3] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#FF6321] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#1A1A1A]">Control y Prudencia: </span>
          El aprendizaje se ejecuta 100% en tu dispositivo con fórmulas matemáticas transparentes. Nunca se asume una verdad permanente ante cambios de contexto o días atípicos.
        </div>
      </div>
    </div>
  );
};
