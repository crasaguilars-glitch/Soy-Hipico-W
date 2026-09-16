import React, { useState, useEffect } from 'react';
import { Calendar, FileText, ExternalLink, RefreshCw, Trophy, Clock, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { getOfficialProgramUrl, getOfficialVolanteUrl, openInternalBrowser, cn } from '../../lib/utils';
import { API_BASE_URL } from '../../api-config';
import axios from 'axios';

interface RaceMeeting {
  id: string;
  fecha: string;
  formattedDate: string;
  hora: string;
  descripcion: string;
  programa_pdf: string | null;
  volante_pdf?: string | null;
  daysAway?: number;
}

interface TrackProgram {
  trackId: number;
  trackName: string;
  domain: string;
  bgImage: string;
  todayRace: RaceMeeting | null;
  upcomingRace: RaceMeeting | null;
  upcomingRaces?: RaceMeeting[];
}

function getCleanDomainUrl(domain: string): string {
  let clean = domain.trim();
  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }
  return `https://${clean}`;
}

export default function ProgramsScreen({ defaultFilter = 'today' }: { defaultFilter?: 'today' | 'upcoming' }) {
  const [tracks, setTracks] = useState<TrackProgram[]>([]);
  const [activeFilter, setActiveFilter] = useState<'today' | 'upcoming'>(defaultFilter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { 
    setActiveFilter(defaultFilter); 
  }, [defaultFilter]);

  const fetchPrograms = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const localToday = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const res = await axios.get(`${API_BASE_URL}/api/programs?today=${localToday}${forceRefresh ? '&refresh=true' : ''}`);
      setTracks(res.data.tracks || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchPrograms(); 
  }, []);

  const meetingsToShow = (() => {
    const list: (RaceMeeting & { track: TrackProgram })[] = [];
    tracks.forEach(track => {
      if (activeFilter === 'today') {
        if (track.todayRace) list.push({ ...track.todayRace, track });
      } else {
        const future = track.upcomingRaces || (track.upcomingRace ? [track.upcomingRace] : []);
        future.forEach(race => { list.push({ ...race, track }); });
      }
    });
    const sorted = list.sort((a, b) => a.fecha.localeCompare(b.fecha));
    if (activeFilter === 'today') return sorted;
    return sorted;
  })();

  const renderRaceCard = (race: RaceMeeting & { track: TrackProgram }) => {
    const track = race.track;
    const normDom = track.domain.toLowerCase();
    const isV = normDom.includes('sporting') || normDom.includes('valparaiso');
    const isChc = normDom.includes('concepcion') || track.trackName.toLowerCase().includes('concepcion') || track.trackName.toLowerCase().includes('concepción') || track.trackId === 1;
    const isHch = track.trackId === 4 || track.trackName.toLowerCase().includes('hipódromo chile') || track.trackName.toLowerCase().includes('hipodromo chile');
    const isChs = track.trackId === 3 || track.trackName.toLowerCase().includes('santiago') || normDom.includes('clubhipico.cl');
    const showProgram = !!race.programa_pdf || !!race.volante_pdf;

    let badgeBg = "bg-emerald-800 text-white";
    let initials = "CHC";
    if (isHch) { badgeBg = "bg-amber-400 text-black"; initials = "HCH"; }
    else if (isChs) { badgeBg = "bg-emerald-600 text-white"; initials = "CHS"; }
    else if (isV) { badgeBg = "bg-blue-600 text-white"; initials = "VSC"; }

    return (
      <div key={`${track.trackId}-${race.fecha}`} className="bg-white rounded-3xl overflow-hidden shadow-xs border border-surface-dim hover:shadow-md transition-all flex flex-col justify-between">
        
        {/* Card Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl ${badgeBg} flex items-center justify-center font-mono font-black text-sm shadow-xs shrink-0`}>
              {initials}
            </div>
            <div>
              <h3 className="text-lg font-serif font-black text-gray-950 uppercase leading-snug">{track.trackName}</h3>
              <p className="text-xs text-gray-400 font-mono">{track.domain}</p>
            </div>
          </div>
          <span className={cn(
            "text-xs font-mono font-bold uppercase px-3 py-1 rounded-full",
            activeFilter === 'today' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          )}>
            {activeFilter === 'today' ? 'Jornada Hoy' : (race.daysAway !== undefined ? `En ${race.daysAway} días` : 'Próxima')}
          </span>
        </div>

        {/* Card Body */}
        <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between font-sans">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-gray-700 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 text-xs font-bold font-mono">
                <Calendar size={15} className="text-emerald-700" />
                <span>{race.formattedDate || race.fecha}</span>
              </div>
              {race.hora && (
                <div className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                  <Clock size={14} />
                  <span>{race.hora}</span>
                </div>
              )}
            </div>
            
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-sans">
              {race.descripcion || "Reunión oficial de carreras según calendario federado."}
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex flex-col gap-2.5">
            {showProgram ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={async () => {
                    const trackId = Number(track.trackId);
                    const url = race.programa_pdf || getOfficialProgramUrl(trackId, race.fecha);
                    await openInternalBrowser(url);
                  }}
                  className="py-3 px-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  title="Abrir Programa Digital PDF Oficial"
                >
                  <FileText size={15} />
                  <span>Programa PDF</span>
                </button>

                <button
                  onClick={async () => {
                    const trackId = Number(track.trackId);
                    const url = race.volante_pdf || getOfficialVolanteUrl(trackId, race.fecha);
                    await openInternalBrowser(url);
                  }}
                  className="py-3 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  title="Abrir Volante Digital PDF Oficial"
                >
                  <FileText size={15} />
                  <span>Volante PDF</span>
                </button>
              </div>
            ) : (
              <div className="py-3 bg-gray-50 text-gray-400 font-mono text-xs font-semibold rounded-xl border border-dashed border-gray-200 text-center uppercase">
                Programa digital en preparación
              </div>
            )}

            {activeFilter === 'today' && (
              <button
                onClick={async () => {
                  let url = "";
                  if (isHch) url = "https://hipodromo.cl/carreras-ultimos-resultados";
                  else if (isChs) url = `https://www.clubhipico.cl/carreras/resultados/?fecha=${race.fecha}`;
                  else if (isV) url = `https://www.sporting.cl/hipica/front/es/resultado/${race.fecha}/01.html`;
                  else if (isChc) url = "https://clubhipicoconcepcion.cl/carreras-ultimos-resultados";

                  if (url) await openInternalBrowser(url);
                }}
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-xs rounded-xl uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <Trophy size={15} /> 
                <span>Resultados de la Jornada</span>
              </button>
            )}

            <button 
              onClick={async () => await openInternalBrowser(getCleanDomainUrl(track.domain))} 
              className="py-2 bg-white hover:bg-gray-50 text-gray-600 font-bold text-[11px] rounded-xl border border-surface-dim uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Sitio Oficial Hipódromo</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 animate-fade-in font-sans">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-6">
        <div>
          <h2 className="text-2xl sm:text-4xl font-serif font-black text-gray-950 uppercase tracking-tight">
            Programas de Carreras
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 font-sans">
            Boletines oficiales, volantes descargables y fechas de reuniones en los 4 hipódromos de Chile.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => fetchPrograms(true)} 
            disabled={loading} 
            className="p-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-surface-dim shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-2 text-xs font-bold"
            id="refresh-programs-btn"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-primary" : ""} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Filter Switcher */}
      <div className="flex max-w-sm bg-gray-200/70 p-1 rounded-2xl border border-surface-dim shadow-inner">
        <button 
          onClick={() => setActiveFilter('today')} 
          className={cn(
            "flex-1 py-2.5 text-center text-xs font-bold rounded-xl transition-all cursor-pointer uppercase tracking-wider",
            activeFilter === 'today' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          Reuniones de Hoy
        </button>
        <button 
          onClick={() => setActiveFilter('upcoming')} 
          className={cn(
            "flex-1 py-2.5 text-center text-xs font-bold rounded-xl transition-all cursor-pointer uppercase tracking-wider",
            activeFilter === 'upcoming' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
          )}
        >
          Próximas Jornadas
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Sincronizando programas...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-8 bg-red-50 text-red-800 rounded-3xl border border-red-200 text-center max-w-md mx-auto space-y-3">
          <p className="text-sm font-medium">{error}</p>
          <button 
            onClick={() => fetchPrograms(true)} 
            className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl uppercase tracking-wider cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Content list */}
      {!loading && !error && (
        <div className="space-y-8">
          {meetingsToShow.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meetingsToShow.map(race => renderRaceCard(race))}
            </div>
          ) : (
            <div className="py-20 text-center bg-white rounded-3xl border border-surface-dim shadow-xs p-8 max-w-lg mx-auto space-y-3">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 mx-auto">
                <Calendar size={28} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 font-serif">
                {activeFilter === 'today' ? "No hay carreras programadas para hoy" : "No hay programas futuros confirmados"}
              </h3>
              <p className="text-xs text-gray-500 font-sans leading-relaxed">
                {activeFilter === 'today'
                  ? "Consulta la pestaña de Próximas Jornadas para ver los siguientes programas de carreras federadas."
                  : "Los hipódromos publican las programaciones definitivas días antes de cada reunión."}
              </p>
              {activeFilter === 'today' && (
                <button
                  onClick={() => setActiveFilter('upcoming')}
                  className="mt-2 px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl uppercase tracking-wider hover:bg-primary/90 cursor-pointer"
                >
                  Ver Próximas Jornadas
                </button>
              )}
            </div>
          )}

          {/* Track informational footer */}
          <div className="p-6 bg-white/70 rounded-3xl border border-dashed border-surface-dim flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-2 font-mono">
              <CheckCircle2 size={16} className="text-emerald-700" />
              <span>Red de Hipódromos: Hipódromo Chile, Club Hípico de Santiago, Valparaíso Sporting, Club Hípico de Concepción.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
