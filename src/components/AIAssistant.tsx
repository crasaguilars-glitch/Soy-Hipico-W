import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { API_BASE_URL } from '../api-config';
import axios from 'axios';
import { useAppVisibility } from '../lib/hooks';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '¡Hola! Soy tu asistente hípico inteligente. ¿En qué puedo ayudarte hoy? Puedo consultar ejemplares, detalles de filiación y campañas de carreras.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/ai/chat`, {
        messages: [...messages, userMessage]
      });

      if (response.data && response.data.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.data.content }]);
      } else {
        throw new Error('Sin respuesta del servidor');
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Lo siento, tuve un problema al procesar tu solicitud hípica. Puedes usar la pestaña de Búsqueda para consultar cualquier ejemplar directamente en la base oficial.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const isVisible = useAppVisibility();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            className="mb-4 w-[90vw] max-w-sm sm:w-96 h-[500px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-surface-dim"
          >
            {/* Header */}
            <div className="bg-primary p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/15 p-2 rounded-xl">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base leading-tight">Asistente Hípico</h3>
                  <p className="text-[10px] text-emerald-200/90 font-mono">Asistente Hípico AI</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/10 p-1.5 rounded-full transition-colors cursor-pointer"
                id="close-chat-btn"
                aria-label="Cerrar chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-parchment/60 font-sans">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed",
                    m.role === 'user' 
                      ? "bg-primary text-white rounded-tr-none shadow-sm" 
                      : "bg-white text-gray-800 shadow-sm border border-surface-dim rounded-tl-none whitespace-pre-wrap"
                  )}>
                    <div className="flex items-center gap-1.5 mb-1 opacity-70">
                      {m.role === 'assistant' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      <span className="text-[9px] uppercase font-bold tracking-wider font-mono">
                        {m.role === 'assistant' ? 'Soy Hípico AI' : 'Tú'}
                      </span>
                    </div>
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className={cn(
                    "bg-white p-3 rounded-2xl shadow-sm border border-surface-dim rounded-tl-none",
                    isVisible && "animate-pulse"
                  )}>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Consultando datos hípicos...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-surface-dim">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Pregunta por un caballo (ej: Il Campione)..."
                  className="w-full pl-4 pr-11 py-2.5 bg-gray-100/80 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 border-none font-sans"
                  id="chat-input"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-1.5 p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  id="send-message-btn"
                  aria-label="Enviar mensaje"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "bg-primary hover:bg-primary/90 text-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-xl transition-all duration-300 group ring-4 ring-white cursor-pointer flex items-center justify-center",
          isOpen && "bg-gray-800"
        )}
        id="toggle-chat-btn"
        aria-label="Abrir asistente de IA"
      >
        {isOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />}
      </button>
    </div>
  );
};
