import React, { useState, useEffect } from 'react';
import { Calendar, Trophy, FileText, ExternalLink, Coins, Link as LinkIcon, Tv, Search, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { getOfficialProgramUrl, getOfficialVolanteUrl, cn, openInternalBrowser, getResultsUrl, TELETRAK_LIVE_STREAM_URL } from '../../lib/utils';
import { API_BASE_URL } from '../../api-config';
import axios from 'axios';
import { db } from '../providers/FirebaseProvider';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { useAppVisibility } from '../../lib/hooks';

interface RaceMeeting {
  id: string;
  fecha: string;
  formattedDate: string;
  hora: string;
  descripcion: string;
  programa_pdf: string | null;
  volante_pdf?: string | null;
}

interface TrackProgram {
  trackId: number;
  trackName: string;
  domain: string;
  bgImage: string;
  todayRace: RaceMeeting | null;
  upcomingRace: RaceMeeting | null;
}

interface InterestLink {
  id: string;
  nombre: string;
  url: string;
  encendido: string;
}

export default function Home({ 
  onNavigateSearch, 
  onNavigatePrograms,
  onNavigateResults,
  onNavigateLive,
  onNavigateRegalones
}: { 
  onNavigateSearch: () => void;
  onNavigatePrograms?: (filter: 'today' | 'upcoming') => void;
  onNavigateResults?: () => void;
  onNavigateLive?: () => void;
  onNavigateRegalones?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [activeTrack, setActiveTrack] = useState<TrackProgram | null>(null);
  const [interestLinks, setInterestLinks] = useState<InterestLink[]>([]);

  const isVisible = useAppVisibility();

  useEffect(() => {
    if (!isVisible) return;

    const q = query(collection(db, 'linkinteres'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const links = snapshot.docs
        .map(doc => {
          const data = doc.data();
          const nombre = data.nombre || "Sin nombre";
          const url = data.url || "#";
          const encendidoRaw = data.encendido;
          const encendido = String(encendidoRaw || "").toUpperCase().trim();

          return {
            id: doc.id,
            nombre,
            url,
            encendido
          };
        })
        .filter(link => link.encendido === 'SI');

      setInterestLinks(links);
      setLoadingLinks(false);
    }, (error) => {
      console.warn("[Home] Error en linkinteres onSnapshot:", error);
      setLoadingLinks(false);
    });

    return () => unsubscribe();
  }, [isVisible]);

  useEffect(() => {
    async function fetchTodayActiveTrack() {
      try {
        setLoading(true);
        const localToday = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const res = await axios.get(`${API_BASE_URL}/api/programs/today?today=${localToday}`);
        if (res.data) {
          setActiveTrack(res.data);
        } else {
          setActiveTrack(null);
        }
      } catch (err) {
        console.warn("Error consultando pista de hoy:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTodayActiveTrack();
  }, []);

  return (
    <div className="flex flex-col animate-fade-in w-full pb-16">
      {/* Hero Section - Full-width modern web banner */}
      <section className="relative w-full h-[220px] sm:h-[300px] lg:h-[360px] overflow-hidden">
        <img 
          src="/hero_horse.png" 
          alt="Carrera Hípica Chilena"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 transform hover:scale-100 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/60 to-black/30" />
        
        <div className="absolute inset-0 max-w-7xl mx-auto px-6 sm:px-10 flex flex-col justify-end pb-8 sm:pb-12 text-white">
          <div className="max-w-2xl space-y-2 sm:space-y-3">
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-emerald-200">
              Red Nacional de Hípica Chilena
            </span>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight uppercase italic leading-tight">
              Soy Hípico
            </h1>
            <p className="text-white/90 text-xs sm:text-sm md:text-base font-medium max-w-lg leading-relaxed font-sans">
              La plataforma integral para el seguimiento de programas oficiales, ejemplares pura sangre y transmisiones en vivo.
            </p>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2">
              <button
                onClick={() => onNavigatePrograms?.('today')}
                className="px-4 py-2.5 bg-tertiary hover:bg-tertiary/90 text-white font-bold text-xs sm:text-sm rounded-xl uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Calendar size={16} />
                <span>Ver Programas</span>
              </button>
              <button
                onClick={onNavigateSearch}
                className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs sm:text-sm rounded-xl uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
              >
                <Search size={16} />
                <span>Buscar Ejemplar</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Responsive 2 or 3 columns on Web */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 z-10 w-full space-y-8">
        
        {/* Row 1: Active Meeting Card & Quick Action Hub */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Active Track Section */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="bg-white rounded-3xl p-8 border border-surface-dim shadow-sm flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-500 font-sans">Consultando programación oficial de hoy...</span>
              </div>
            ) : activeTrack && activeTrack.todayRace ? (
              <motion.div 
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-dim shadow-sm space-y-6"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className={cn(
                      "w-2.5 h-2.5 rounded-full bg-red-600",
                      isVisible && "animate-pulse"
                    )} />
                    <span className="text-xs sm:text-sm font-black text-slate-800 tracking-wider uppercase font-mono">
                      REUNIÓN OFICIAL HOY
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono font-semibold">Chile</span>
                </div>

                <div
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer group"
                  onClick={async () => {
                    if (activeTrack.todayRace) {
                      const trackId = Number(activeTrack.trackId);
                      const url = activeTrack.todayRace.programa_pdf || activeTrack.todayRace.volante_pdf || getOfficialProgramUrl(trackId, activeTrack.todayRace.fecha);
                      await openInternalBrowser(url);
                    }
                  }}
                >
                  <div className="flex items-center gap-4">
                    {(() => {
                      const normDom = (activeTrack.domain || "").toLowerCase();
                      const trackName = activeTrack.trackName || "";
                      const isHch = normDom.includes('hipodromo') || trackName.toLowerCase().includes('hipódromo') || trackName.toLowerCase().includes('hipodromo');
                      const isChs = normDom.includes('clubhipico.cl') || trackName.toLowerCase().includes('santiago');
                      const isVsc = normDom.includes('sporting') || normDom.includes('valparaiso');
                      
                      let badgeBg = "bg-emerald-800 text-white";
                      let initials = "CHC";
                      let logoUrl = "https://www.google.com/s2/favicons?sz=64&domain=clubhipicoconcepcion.cl";

                      if (isHch) { badgeBg = "bg-amber-400 text-black"; initials = "HCH"; logoUrl = "https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_Hip%C3%B3dromo_Chile.svg"; }
                      else if (isChs) { badgeBg = "bg-emerald-600 text-white"; initials = "CHS"; logoUrl = "https://upload.wikimedia.org/wikipedia/commons/e/ea/Club_H%C3%ADpico_de_Santiago_logo.svg"; }
                      else if (isVsc) { badgeBg = "bg-blue-600 text-white"; initials = "VSC"; logoUrl = "https://upload.wikimedia.org/wikipedia/commons/2/23/Valpara%C3%ADso_Sporting_Club_logo.svg"; }

                      return (
                        <div className={`relative w-14 h-14 rounded-2xl shrink-0 ${badgeBg} flex items-center justify-center font-mono font-bold text-sm shadow-sm overflow-hidden`}>
                          <span className="absolute text-center z-0">{initials}</span>
                          {logoUrl && (
                            <img 
                              src={logoUrl} 
                              className="absolute inset-0 w-full h-full object-contain p-1.5 bg-white z-10" 
                              alt={trackName}
                              referrerPolicy="no-referrer"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}
                        </div>
                      );
                    })()}

                    <div>
                      <h3 className="text-xl sm:text-2xl font-serif font-black text-slate-950 tracking-tight uppercase group-hover:text-primary transition-colors">
                        {activeTrack.trackName || "Reunión de Carreras"}
                      </h3>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{activeTrack.domain}</p>
                    </div>
                  </div>

                  <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-full uppercase">
                    Jornada Activa
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={async () => {
                      const trackId = Number(activeTrack.trackId);
                      const url = activeTrack.todayRace?.programa_pdf || activeTrack.todayRace?.volante_pdf || getOfficialProgramUrl(trackId, activeTrack.todayRace?.fecha);
                      await openInternalBrowser(url);
                    }}
                    className="py-3 px-4 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow transition-all text-center uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileText size={15} />
                    Ver Programa Digital (PDF)
                  </button>

                  <button
                    onClick={async () => {
                      const trackId = Number(activeTrack.trackId);
                      const url = getResultsUrl(trackId, activeTrack.todayRace?.fecha);
                      await openInternalBrowser(url);
                    }}
                    className="py-3 px-4 bg-secondary hover:bg-secondary/90 text-white font-bold text-xs rounded-xl shadow transition-all text-center uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trophy size={15} />
                    Últimos Resultados
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-surface-dim shadow-sm flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                  <Calendar size={24} />
                </div>
                <h3 className="text-base font-bold text-gray-700 uppercase tracking-wider font-mono">Sin Reuniones Programadas para Hoy</h3>
                <p className="text-xs text-gray-400 max-w-md font-sans">
                  No se registran jornadas del programa oficial para el día de hoy en la red nacional de hipódromos. Puedes consultar las próximas carreras en la pestaña de Programas.
                </p>
                <button
                  onClick={() => onNavigatePrograms?.('upcoming')}
                  className="mt-2 px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl uppercase tracking-wider hover:bg-primary/90 transition-all cursor-pointer"
                >
                  Ver Próximas Jornadas
                </button>
              </div>
            )}
          </div>

          {/* Quick Links & Teletrak Apuestas */}
          <div className="space-y-4">
            <motion.a 
              href="https://apuestas.teletrak.cl" 
              target="_blank" 
              rel="noopener noreferrer"
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-between p-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-3xl shadow-sm transition-all"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-white/10 rounded-2xl">
                  <Coins size={22} className="text-white" />
                </div>
                <div>
                  <span className="block text-xs font-black uppercase tracking-wider text-white">Apuestas Oficiales</span>
                  <span className="block text-[11px] text-emerald-100">Portal Teletrak Apuestas</span>
                </div>
              </div>
              <ExternalLink size={16} className="text-white/80 shrink-0" />
            </motion.a>

            <motion.div 
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-between p-5 bg-slate-900 hover:bg-black text-white rounded-3xl shadow-sm transition-all"
            >
              <div 
                onClick={onNavigateLive}
                className="flex items-center gap-3.5 flex-1 cursor-pointer"
              >
                <div className="p-3 bg-red-600/30 text-red-400 rounded-2xl">
                  <Tv size={22} />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-black uppercase tracking-wider text-white">Teletrak TV en Vivo</span>
                  <span className="block text-[11px] text-gray-400">Transmisión oficial de carreras</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await openInternalBrowser(TELETRAK_LIVE_STREAM_URL);
                  }}
                  title="Abrir Señal en Vivo en nueva pestaña"
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                >
                  <ExternalLink size={16} />
                </button>
                <div onClick={onNavigateLive} className="cursor-pointer">
                  <ChevronRight size={18} className="text-gray-400" />
                </div>
              </div>
            </motion.div>

            <motion.button 
              onClick={onNavigateRegalones}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-between p-5 bg-white hover:bg-gray-50 text-gray-900 rounded-3xl border border-surface-dim shadow-xs transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
                  <Trophy size={22} />
                </div>
                <div className="text-left">
                  <span className="block text-xs font-black uppercase tracking-wider text-gray-900">Tus Regalones</span>
                  <span className="block text-[11px] text-gray-500">Monitorea tus caballos inscritos</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </motion.button>
          </div>
        </div>

        {/* Row 2: Links de Interés */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-dim shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-2xl border border-blue-100 text-blue-700">
                <LinkIcon size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 font-sans">Sitios de Interés Hípico</h3>
                <p className="text-xs text-gray-500">Acceso a páginas oficiales, reglamentos y servicios hípicos</p>
              </div>
            </div>
            <span className="text-xs font-mono text-gray-400">{interestLinks.length} enlaces activos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {interestLinks.length > 0 ? (
              interestLinks.map((link) => (
                <motion.a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-between px-4 py-3.5 bg-gray-50/80 hover:bg-gray-100 border border-gray-200/60 rounded-2xl transition-all group"
                >
                  <span className="text-xs font-bold text-gray-800 group-hover:text-primary truncate">{link.nombre}</span>
                  <ExternalLink size={14} className="text-gray-400 group-hover:text-primary shrink-0 ml-2 transition-colors" />
                </motion.a>
              ))
            ) : (
              <div className="col-span-full py-8 text-center">
                <p className="text-xs text-gray-400 italic">
                  {loadingLinks ? "Cargando enlaces de interés..." : "No hay enlaces de interés disponibles actualmente"}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
