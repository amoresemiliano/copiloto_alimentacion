import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Send,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ThumbsUp,
  XCircle,
  ShoppingBag,
  Utensils,
  Calendar,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { ConversationMessage, Recommendation, LearningHypothesis } from '../types/domain';

export const ConversationView: React.FC = () => {
  const {
    conversationMessages,
    sendConversationMessage,
    clearConversation,
    openDetailModal,
    openPlanMealModal,
    updateHypothesisStatus,
    setTab,
  } = useApp();

  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationMessages]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      sendConversationMessage(trimmed);
      setInput('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickReply = (text: string) => {
    sendConversationMessage(text);
  };

  const presetPrompts = [
    { label: '¿Qué ceno rápido?', text: '¿Qué puedo cenar rápido?' },
    { label: '15 min + Poca energía', text: 'Tengo 15 minutos y poca energía' },
    { label: 'Tengo pollo, tomate y queso', text: 'Tengo pollo, tomate, queso y huevos' },
    { label: 'Comí pizza', text: 'Al final comí pizza' },
    { label: 'Planificar pasta mañana', text: 'Mañana quiero comer pasta' },
    { label: '¿Qué me falta comprar?', text: '¿Qué me falta comprar?' },
    { label: '¿Qué aprendiste de mí?', text: '¿Qué aprendiste de mí?' },
    { label: 'Alergia al maní', text: 'No puedo comer maní, tengo alergia' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px] max-h-[850px] bg-white rounded-2xl border border-[#E5E5E3] shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 bg-[#FAF9F6] border-b border-[#E5E5E3] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <Sparkles className="w-4 h-4 text-[#FF6321]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-[#1A1A1A]">Copiloto Conversacional</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] animate-pulse"></span>
                Cerebro Compartido
              </span>
            </div>
            <p className="text-[11px] text-[#737373]">
              Adaptador directo a motor contextual, inventario, planificación y aprendizaje
            </p>
          </div>
        </div>

        <button
          id="btn-clear-conversation"
          onClick={clearConversation}
          title="Reiniciar conversación"
          className="p-1.5 text-[#8C8C8C] hover:text-[#1A1A1A] hover:bg-[#EBEBEA] rounded-lg transition-all flex items-center gap-1 text-xs font-medium"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">Reiniciar</span>
        </button>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#FBFBFA]">
        {conversationMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onQuickReply={handleQuickReply}
            onSelectRecommendation={(rec) => openDetailModal(rec)}
            onPlanRecommendation={(rec) => openPlanMealModal(rec.recipe)}
            onConfirmHypothesis={(id) => updateHypothesisStatus(id, 'confirmed_by_user')}
            onDismissHypothesis={(id) => updateHypothesisStatus(id, 'dismissed_by_user')}
            onNavigateTab={(tab) => setTab(tab)}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-4 py-2 bg-[#FAF9F6] border-t border-[#EBEBEA] overflow-x-auto no-scrollbar flex-shrink-0 flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-[#8C8C8C] whitespace-nowrap flex items-center gap-1 pr-1">
          <Sparkles className="w-3 h-3 text-[#FF6321]" /> Sugerencias:
        </span>
        {presetPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleQuickReply(p.text)}
            className="px-2.5 py-1 text-xs bg-white hover:bg-[#1A1A1A] hover:text-white text-[#404040] border border-[#E5E5E3] hover:border-[#1A1A1A] rounded-full whitespace-nowrap transition-all font-medium shadow-2xs"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 sm:p-4 bg-white border-t border-[#E5E5E3] flex items-center gap-2 flex-shrink-0"
      >
        <input
          ref={inputRef}
          id="conversation-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribí qué querés comer, qué compraste o qué tenés en casa..."
          className="flex-1 px-4 py-2.5 text-sm bg-[#F5F5F4] border border-[#E5E5E3] rounded-xl text-[#1A1A1A] placeholder-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 focus:border-[#1A1A1A] transition-all"
        />
        <button
          id="btn-conversation-send"
          type="submit"
          disabled={!input.trim() || isSubmitting}
          className="p-2.5 sm:px-4 sm:py-2.5 bg-[#1A1A1A] text-white hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs"
        >
          <Send className="w-4 h-4 text-[#FF6321]" />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>
    </div>
  );
};

interface MessageBubbleProps {
  message: ConversationMessage;
  onQuickReply: (text: string) => void;
  onSelectRecommendation: (rec: Recommendation) => void;
  onPlanRecommendation: (rec: Recommendation) => void;
  onConfirmHypothesis: (id: string) => void;
  onDismissHypothesis: (id: string) => void;
  onNavigateTab: (tab: any) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onQuickReply,
  onSelectRecommendation,
  onPlanRecommendation,
  onConfirmHypothesis,
  onDismissHypothesis,
  onNavigateTab,
}) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-[70%] bg-[#1A1A1A] text-white px-4 py-2.5 rounded-2xl rounded-tr-xs shadow-xs text-sm font-medium leading-relaxed">
          {message.text}
        </div>
      </div>
    );
  }

  const { payload, actions } = message;

  return (
    <div className="flex items-start gap-2.5 max-w-[95%] sm:max-w-[88%]">
      <div className="w-7 h-7 rounded-lg bg-[#FAF0EB] border border-[#FCD9C7] text-[#FF6321] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
        ✦
      </div>

      <div className="flex-1 space-y-3">
        {/* Main Text Card */}
        <div className="bg-white border border-[#E5E5E3] p-4 rounded-2xl rounded-tl-xs shadow-xs text-sm text-[#262626] leading-relaxed space-y-2">
          <div className="whitespace-pre-line">{message.text}</div>

          {/* Action indicator tag if domain actions were executed */}
          {actions && actions.length > 0 && (
            <div className="pt-2 border-t border-[#F0F0EE] flex flex-wrap gap-1.5 items-center">
              {actions.map((act, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F5F5F4] text-[#525252] border border-[#E5E5E3]"
                >
                  <CheckCircle2 className="w-3 h-3 text-[#2E7D32]" />
                  {act.description}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Payload: Recommendations Cards */}
        {payload?.recommendations && payload.recommendations.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {payload.recommendations.map((rec) => (
              <div
                key={rec.recipe.id}
                className="bg-white border border-[#E5E5E3] hover:border-[#1A1A1A] p-3 rounded-xl transition-all shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-[#1A1A1A] leading-snug">{rec.recipe.name}</h4>
                    <span className="text-[10px] text-[#737373] flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-[#8C8C8C]" /> {rec.recipe.prepTimeMinutes} min · {rec.recipe.difficulty}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-[#FAF0EB] text-[#FF6321] border border-[#FCD9C7]">
                    {rec.matchPercentage}% match
                  </span>
                </div>

                {rec.positiveReasons.length > 0 && (
                  <p className="text-[11px] text-[#525252] bg-[#F7F7F6] p-1.5 rounded-lg border border-[#EBEBEA] line-clamp-2">
                    <span className="font-semibold text-[#1A1A1A]">Razón: </span>
                    {rec.positiveReasons[0]}
                  </p>
                )}

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => onSelectRecommendation(rec)}
                    className="flex-1 py-1 px-2 text-[11px] font-bold bg-[#1A1A1A] text-white hover:bg-black rounded-lg transition-all text-center"
                  >
                    Cocinar ahora
                  </button>
                  <button
                    onClick={() => onPlanRecommendation(rec)}
                    className="py-1 px-2 text-[11px] font-semibold bg-[#F0F0EE] hover:bg-[#E5E5E3] text-[#262626] rounded-lg transition-all flex items-center gap-1"
                  >
                    <Calendar className="w-3 h-3" />
                    Planificar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payload: Hypotheses Interactive Review */}
        {payload?.hypotheses && payload.hypotheses.length > 0 && (
          <div className="space-y-2">
            {payload.hypotheses.map((h) => (
              <div
                key={h.id}
                className="bg-white border border-[#E5E5E3] p-3 rounded-xl shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#1A1A1A]">{h.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    h.status === 'confirmed_by_user'
                      ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                      : 'bg-[#FFF8E1] text-[#F57F17] border-[#FFE082]'
                  }`}>
                    {h.status === 'confirmed_by_user' ? 'Confirmada' : `Confianza ${h.confidence}`}
                  </span>
                </div>
                <p className="text-xs text-[#525252]">{h.description}</p>

                {h.status !== 'confirmed_by_user' && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onConfirmHypothesis(h.id)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-[#E8F5E9] text-[#2E7D32] hover:bg-[#C8E6C9] border border-[#C8E6C9] rounded-lg flex items-center gap-1 transition-all"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      Es correcto
                    </button>
                    <button
                      onClick={() => onDismissHypothesis(h.id)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-[#FFEBEE] text-[#C62828] hover:bg-[#FFCDD2] border border-[#FFCDD2] rounded-lg flex items-center gap-1 transition-all"
                    >
                      <XCircle className="w-3 h-3" />
                      Descartar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Suggested Quick Replies */}
        {payload?.suggestedReplies && payload.suggestedReplies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {payload.suggestedReplies.map((reply, idx) => (
              <button
                key={idx}
                onClick={() => onQuickReply(reply)}
                className="px-3 py-1 text-xs font-semibold bg-white hover:bg-[#1A1A1A] hover:text-white text-[#262626] border border-[#DCDCDA] hover:border-[#1A1A1A] rounded-full transition-all shadow-2xs"
              >
                {reply}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
