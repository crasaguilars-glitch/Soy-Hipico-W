import React, { useState } from 'react';
import { Search, ChevronRight, Loader2, Sparkles, Database, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { API_BASE_URL } from '../../api-config';

interface SearchResult {
  id: string;
  name: string;
  subtitle: string;
  source?: string;
}

const POPULAR_SEARCHES = ["Il Campione", "Gran Greco", "Command", "El Facha", "Look Dad", "Y Nada Mas"];

export default function SearchScreen({ onSelectHorse }: { onSelectHorse: (id: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const executeSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    setHasSearched(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
      setResults(response.data.results || []);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    executeSearch(searchQuery);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-8 animate-fade-in font-sans">
      
      {/* Header section */}
      <div className="text-center sm:text-left space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-mono font-semibold border border-emerald-200">
          <Database size={13} />
          <span>Base de Datos Oficial de Ejemplares</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-serif font-black tracking-tight text-gray-950 uppercase">
          Búsqueda de Ejemplares
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 max-w-xl">
          Consulta el historial genealógico, filiación completa (padre, madre, criador), RUT de registro y campaña de carreras por año.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl border border-surface-dim shadow-sm flex flex-col sm:flex-row items-center gap-2">
        <div className="relative w-full flex items-center">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
            <Search size={20} />
          </div>
          <input 
            type="text"
            placeholder="Escribe el nombre del caballo (ej: Il Campione)..."
            className="w-full bg-transparent border-none py-3.5 pl-12 pr-4 focus:outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            id="horse-search-input"
          />
        </div>

        <button 
          onClick={handleSearch}
          disabled={loading || !searchQuery.trim()}
          className="w-full sm:w-auto px-6 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl sm:rounded-2xl text-xs font-bold transition-all disabled:opacity-50 uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0"
          id="horse-search-submit"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
          <span>Buscar</span>
        </button>
      </div>

      {/* Quick Search Tags */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-500 font-medium flex items-center gap-1">
          <Sparkles size={13} className="text-amber-500" />
          Sugerencias rápidas:
        </span>
        {POPULAR_SEARCHES.map((name) => (
          <button
            key={name}
            onClick={() => {
              setSearchQuery(name);
              executeSearch(name);
            }}
            className="px-3 py-1 bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-900 border border-surface-dim hover:border-emerald-300 rounded-full text-xs font-medium transition-colors cursor-pointer"
          >
            {name}
          </button>
        ))}
      </div>

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {hasSearched ? (
          <motion.div 
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg sm:text-xl font-serif font-bold text-gray-900">
                Resultados {results.length > 0 ? `(${results.length} encontrados)` : ''}
              </h3>
              <button 
                onClick={() => { setHasSearched(false); setSearchQuery(''); setResults([]); }}
                className="text-gray-500 hover:text-primary text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Limpiar búsqueda
              </button>
            </div>

            {results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {results.map((horse) => (
                  <motion.div
                    key={horse.id}
                    whileHover={{ y: -2 }}
                    className="bg-white rounded-2xl sm:rounded-3xl border border-surface-dim hover:border-primary/40 p-5 flex flex-col justify-between gap-3 shadow-xs hover:shadow-md transition-all text-left group cursor-pointer"
                    onClick={() => onSelectHorse(horse.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h4 className="font-serif font-bold text-lg text-gray-950 group-hover:text-primary transition-colors">
                          {horse.name}
                        </h4>
                        <p className="text-xs text-gray-500 font-mono">
                          {horse.subtitle ? horse.subtitle.replace(/\s*-\s*Stud Book( de Chile)?/gi, "") : "Ficha Oficial"}
                        </p>
                      </div>
                      <div className="p-2 rounded-xl bg-gray-50 group-hover:bg-primary/10 text-gray-400 group-hover:text-primary transition-colors">
                        <ChevronRight size={18} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-400">
                      <span className="font-mono">RUT: {horse.id}</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        Ver Campaña y Filiación &rarr;
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : !loading && (
              <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-surface-dim p-6">
                <div className="w-12 h-12 rounded-full bg-gray-100 mx-auto flex items-center justify-center text-gray-400 mb-3">
                  <Search size={22} />
                </div>
                <h4 className="text-base font-bold text-gray-800 font-serif">No se encontraron resultados</h4>
                <p className="text-gray-500 text-xs italic font-medium max-w-sm mx-auto mt-1">
                  No encontramos registros oficiales para "{searchQuery}". Intenta verificar la ortografía o buscar solo una palabra del nombre.
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="initial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center gap-4 bg-white/60 rounded-3xl border border-surface-dim p-8"
          >
            <div className="bg-primary/5 p-6 rounded-full text-primary">
              <Search size={44} />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-xl font-serif font-bold text-gray-900">Consulta de Genealogía y Campaña</h3>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                Ingresa el nombre del caballo para ver su pedigrí de 3 generaciones, detalle de todas las carreras disputadas, sumas ganadas e historial completo.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
