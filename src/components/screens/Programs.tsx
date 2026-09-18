import React, { useState, useEffect } from 'react';
import { Calendar, FileText, ExternalLink, RefreshCw, Trophy, Clock, CheckCircle2, MapPin, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { getOfficialProgramUrl, getOfficialVolanteUrl, getResultsUrl, openInternalBrowser, cn } from '../../lib/utils';
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

interface TrackInfo {
  isHch: boolean;
  isChs: boolean;
  isVsc: boolean;
  isChc: boolean;
  badgeBg: string;
  initials: string;
  logoUrl: string;
  location: string;
  surface: string;
  photoUrl: string;
  tagColor: string;
}

function getTrackLogoInfo(track: TrackProgram): TrackInfo {
  const normDom = (track.domain || "").toLowerCase();
  const trackName = (track.trackName || "").toLowerCase();
  const trackId = Number(track.trackId);

  const isHch = trackId === 4 || normDom.includes('hipodromo') || trackName.includes('hipódromo') || trackName.includes('hipodromo');
  const isChs = trackId === 3 || normDom.includes('clubhipico.cl') || trackName.includes('santiago');
  const isVsc = trackId === 2 || normDom.includes('sporting') || normDom.includes('valparaiso');
  const isChc = trackId === 1 || normDom.includes('concepcion') || trackName.includes('concepcion') || trackName.includes('concepción');

  let badgeBg = "bg-emerald-900 text-white";
  let initials = "CHC";
  let logoUrl = "https://www.google.com/s2/favicons?sz=64&domain=clubhipicoconcepcion.cl";
  let location = "Mediocamino • Hualpén";
  let surface = "Pista de Arena";
  let photoUrl = "/tracks/chc.jpg";
  let tagColor = "bg-emerald-800 text-white";

  if (isHch) {
    badgeBg = "bg-amber-400 text-black";
    initials = "HCH";
    logoUrl = "https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_Hip%C3%B3dromo_Chile.svg";
    location = "Independencia • Santiago";
    surface = "Pista de Arena";
    photoUrl = "/tracks/hch.jpg";
    tagColor = "bg-amber-400 text-slate-950";
  } else if (isChs) {
    badgeBg = "bg-emerald-700 text-white";
    initials = "CHS";
    logoUrl = "https://upload.wikimedia.org/wikipedia/commons/e/ea/Club_H%C3%ADpico_de_Santiago_logo.svg";
    location = "Blanco Encalada • Santiago";
    surface = "Pista de Pasto";
    photoUrl = "/tracks/chs.jpg";
    tagColor = "bg-emerald-600 text-white";
  } else if (isVsc) {
    badgeBg = "bg-blue-600 text-white";
    initials = "VSC";
    logoUrl = "https://upload.wikimedia.org/wikipedia/commons/2/23/Valpara%C3%ADso_Sporting_Club_logo.svg";
    location = "Viña del Mar • Valparaíso";
    surface = "Pista de Pasto";
    photoUrl = "/tracks/vsc.jpg";
    tagColor = "bg-blue-600 text-white";
  }

  return { isHch, isChs, isVsc, isChc, badgeBg, initials, logoUrl, location, surface, photoUrl, tagColor };
}

export default function ProgramsScreen({ defaultFilter = 'today' }: { defaultFilter?: 'today' | 'upcoming' }) {
  const [tracks, setTracks] = useState<TrackProgram[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'upcoming'>(defaultFilter);
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

  // List of today's races
  const todayRaces: (RaceMeeting & { track: TrackProgram })[] = [];
  // List of upcoming races
  const upcomingRaces: (RaceMeeting & { track: TrackProgram })[] = [];

  tracks.forEach(track => {
    if (track.todayRace) {
      todayRaces.push({ ...track.todayRace, track });
    }
    const future = track.upcomingRaces || (track.upcomingRace ? [track.upcomingRace] : []);
    future.forEach(race => {
      upcomingRaces.push({ ...race, track });
    });
  });

  todayRaces.sort((a, b) => a.fecha.localeCompare(b.fecha));
  upcomingRaces.sort((a, b) => a.fecha.localeCompare(b.fecha));

  const showTodaySection = activeFilter === 'all' || activeFilter === 'today';
  const showUpcomingSection = activeFilter === 'all' || activeFilter === 'upcoming';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-10 animate-fade-in font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
              <Sparkles size={12} className="text-emerald-700" />
              <span>Red Oficial de Carreras</span>
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-serif font-black text-slate-950 uppercase tracking-tight">
            Programas de Carreras
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-sans">
            Boletines oficiales, volantes descargables y reuniones federadas de los 4 hipódromos de Chile.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => fetchPrograms(true)} 
            disabled={loading} 
            className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-2xl border border-surface-dim shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-2 text-xs font-bold transition-all active:scale-95"
            id="refresh-programs-btn"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-primary" : ""} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Filter Selector */}
      <div className="flex max-w-md bg-white p-1.5 rounded-2xl border border-surface-dim shadow-xs gap-1.5">
        <button 
          onClick={() => setActiveFilter('today')} 
          className={cn(
            "flex-1 py-2.5 text-center text-xs font-bold rounded-xl transition-all cursor-pointer uppercase tracking-wider",
            activeFilter === 'today' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          Reunión de hoy
        </button>
        <button 
          onClick={() => setActiveFilter('upcoming')} 
          className={cn(
            "flex-1 py-2.5 text-center text-xs font-bold rounded-xl transition-all cursor-pointer uppercase tracking-wider",
            activeFilter === 'upcoming' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          Próximas Jornadas
        </button>
        <button 
          onClick={() => setActiveFilter('all')} 
          className={cn(
            "px-4 py-2.5 text-center text-xs font-bold rounded-xl transition-all cursor-pointer uppercase tracking-wider",
            activeFilter === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          Todos
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-3xl p-12 border border-surface-dim shadow-xs flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Sincronizando programas de carreras...</span>
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

      {/* Content sections */}
      {!loading && !error && (
        <div className="space-y-12">

          {/* ========================================================= */}
          {/* SECCIÓN 1: Reunión de hoy                                 */}
          {/* ========================================================= */}
          {showTodaySection && (
            <section className="space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse ring-4 ring-red-100" />
                  <h3 className="text-base sm:text-lg font-serif font-black text-slate-950 uppercase tracking-tight">
                    Reunión de hoy
                  </h3>
                </div>
                <span className="text-xs text-gray-400 font-mono font-semibold">
                  {todayRaces.length > 0 ? `${todayRaces.length} reunión(es) activa(s)` : 'Chile'}
                </span>
              </div>

              {todayRaces.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {todayRaces.map((race) => {
                    const track = race.track;
                    const { isHch, isChs, isVsc, isChc, badgeBg, initials, logoUrl, location, surface, photoUrl } = getTrackLogoInfo(track);
                    const showProgram = !!race.programa_pdf || !!race.volante_pdf;

                    return (
                      <motion.div
                        key={`today-${track.trackId}-${race.fecha}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                      >
                        {/* 1. Portada Real del Hipódromo (Banner autónomo sin superposición forzada) */}
                        <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-900">
                          <img 
                            src={photoUrl} 
                            alt={`Instalaciones oficiales ${track.trackName}`} 
                            className="w-full h-full object-cover object-center brightness-85" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              // Fallback silencioso si la imagen local falla
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/15" />

                          {/* Distintivos limpios en la portada */}
                          <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between gap-2 z-10">
                            <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white text-[11px] font-mono font-medium rounded-full border border-white/20 flex items-center gap-1.5 shadow-sm">
                              <MapPin size={11} className="text-amber-400 shrink-0" />
                              <span>{location}</span>
                            </span>

                            <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-mono font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 shadow-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                              <span>En Vivo Hoy</span>
                            </span>
                          </div>

                          <div className="absolute bottom-3 right-4 z-10">
                            <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-emerald-300 text-[10px] font-mono font-bold uppercase rounded-md border border-white/10 shadow-sm">
                              {surface}
                            </span>
                          </div>
                        </div>

                        {/* 2. Cuerpo de la Tarjeta (Distribución armoniosa y espaciosa) */}
                        <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                          
                          {/* Identidad del recinto (Escudo + Nombre en bloque independiente) */}
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl ${badgeBg} border border-slate-200 shadow-xs flex items-center justify-center font-mono font-black text-sm shrink-0 overflow-hidden relative`}>
                              <span className="absolute z-0 text-center">{initials}</span>
                              {logoUrl && (
                                <img 
                                  src={logoUrl} 
                                  className="w-full h-full object-contain p-1.5 bg-white z-10" 
                                  alt={track.trackName}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              )}
                            </div>

                            <div className="min-w-0">
                              <h3 className="text-xl sm:text-2xl font-serif font-black text-slate-950 uppercase tracking-tight leading-snug truncate">
                                {track.trackName}
                              </h3>
                              <p className="text-xs text-slate-400 font-mono mt-0.5">{track.domain}</p>
                            </div>
                          </div>

                          {/* Bloque de fecha y descripción */}
                          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono font-bold text-slate-800">
                              <div className="flex items-center gap-2">
                                <Calendar size={15} className="text-primary shrink-0" />
                                <span>{race.formattedDate || race.fecha}</span>
                              </div>
                              {race.hora && (
                                <div className="flex items-center gap-1.5 text-slate-500 font-mono text-xs">
                                  <Clock size={13} />
                                  <span>{race.hora} hrs</span>
                                </div>
                              )}
                            </div>
                            
                            <p className="text-xs sm:text-sm text-slate-600 font-sans leading-relaxed pt-2 border-t border-slate-200/60">
                              {race.descripcion || "Reunión oficial de carreras federadas según calendario federado."}
                            </p>
                          </div>

                          {/* 3. Botonera de acciones (Estilo definido y proporcionado) */}
                          <div className="space-y-3 pt-1">
                            
                            {/* Programa y Volante */}
                            {showProgram ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <button
                                  onClick={async () => {
                                    const trackId = Number(track.trackId);
                                    const url = getOfficialProgramUrl(trackId, race.fecha);
                                    await openInternalBrowser(url);
                                  }}
                                  className="py-3 px-4 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all uppercase tracking-wider flex items-center justify-between group cursor-pointer"
                                  title="Abrir Programa Digital PDF Oficial"
                                >
                                  <div className="flex items-center gap-2">
                                    <FileText size={15} className="text-primary shrink-0" />
                                    <span>Programa</span>
                                  </div>
                                  <span className="text-[10px] font-mono bg-white/15 px-2 py-0.5 rounded text-slate-200 font-bold">PDF</span>
                                </button>

                                <button
                                  onClick={async () => {
                                    const trackId = Number(track.trackId);
                                    const url = getOfficialVolanteUrl(trackId, race.fecha);
                                    await openInternalBrowser(url);
                                  }}
                                  className="py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all uppercase tracking-wider flex items-center justify-between group cursor-pointer"
                                  title="Abrir Volante Digital PDF Oficial"
                                >
                                  <div className="flex items-center gap-2">
                                    <FileText size={15} className="text-emerald-200 shrink-0" />
                                    <span>Volante</span>
                                  </div>
                                  <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded text-emerald-100 font-bold">PDF</span>
                                </button>
                              </div>
                            ) : (
                              <div className="py-3 bg-gray-50 text-gray-400 font-mono text-xs font-semibold rounded-xl border border-dashed border-gray-200 text-center uppercase">
                                Programa digital en preparación
                              </div>
                            )}

                            {/* Resultados de la Jornada */}
                            <button
                              onClick={async () => {
                                let url = "";
                                if (isHch) url = "https://hipodromo.cl/carreras-ultimos-resultados";
                                else if (isChs) url = `https://www.clubhipico.cl/carreras/resultados/?fecha=${race.fecha}`;
                                else if (isVsc) url = `https://www.sporting.cl/hipica/front/es/resultado/${race.fecha}/01.html`;
                                else if (isChc) url = "https://clubhipicoconcepcion.cl/carreras-ultimos-resultados";
                                if (!url) url = getResultsUrl(track.trackId, race.fecha);

                                if (url) await openInternalBrowser(url);
                              }}
                              className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 shadow-xs transition-all"
                            >
                              <Trophy size={16} className="text-amber-950 shrink-0" />
                              <span>Resultados de la Jornada</span>
                            </button>

                            {/* Botón Sitio Oficial (con el símbolo oficial del recinto en miniatura) */}
                            <button 
                              onClick={async () => await openInternalBrowser(getCleanDomainUrl(track.domain))} 
                              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 uppercase tracking-wider cursor-pointer flex items-center justify-between transition-all group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-6 h-6 rounded-lg ${badgeBg} flex items-center justify-center p-0.5 overflow-hidden shrink-0 border border-slate-300 shadow-2xs`}>
                                  {logoUrl ? (
                                    <img 
                                      src={logoUrl} 
                                      alt={initials} 
                                      className="w-full h-full object-contain bg-white rounded-xs" 
                                      referrerPolicy="no-referrer" 
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                  ) : (
                                    <span className="text-[8px] font-mono font-bold text-white">{initials}</span>
                                  )}
                                </div>
                                <span className="truncate group-hover:text-primary transition-colors">
                                  Sitio Oficial {initials}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-slate-400 group-hover:text-primary transition-colors shrink-0">
                                <span className="text-[10px] font-mono lowercase hidden sm:inline">{track.domain}</span>
                                <ExternalLink size={13} />
                              </div>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-8 border border-surface-dim shadow-xs flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                    <Calendar size={24} />
                  </div>
                  <h4 className="text-base font-bold text-gray-700 uppercase tracking-wider font-mono">
                    Sin Reuniones Programadas para Hoy
                  </h4>
                  <p className="text-xs text-gray-400 max-w-md font-sans leading-relaxed">
                    No se registran jornadas del programa oficial para el día de hoy en la red nacional de hipódromos. Puedes consultar las próximas carreras a continuación.
                  </p>
                  {activeFilter === 'today' && (
                    <button
                      onClick={() => setActiveFilter('upcoming')}
                      className="mt-2 px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl uppercase tracking-wider hover:bg-primary/90 transition-all cursor-pointer"
                    >
                      Ver Próximas Jornadas
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ========================================================= */}
          {/* SECCIÓN 2: Próximas Jornadas                              */}
          {/* ========================================================= */}
          {showUpcomingSection && (
            <section className="space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-800">
                    <Calendar size={18} />
                  </div>
                  <h3 className="text-base sm:text-lg font-serif font-black text-slate-950 uppercase tracking-tight">
                    Próximas Jornadas
                  </h3>
                </div>
                <span className="text-xs text-gray-400 font-mono font-semibold">
                  {upcomingRaces.length} reunión(es) confirmada(s)
                </span>
              </div>

              {upcomingRaces.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingRaces.map((race) => {
                    const track = race.track;
                    const { badgeBg, initials, logoUrl, location, surface, photoUrl } = getTrackLogoInfo(track);
                    const showProgram = !!race.programa_pdf || !!race.volante_pdf;

                    return (
                      <motion.div
                        key={`upcoming-${track.trackId}-${race.fecha}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                      >
                        {/* Portada Real del Hipódromo */}
                        <div className="relative h-36 w-full overflow-hidden bg-slate-900">
                          <img 
                            src={photoUrl} 
                            alt={`Instalaciones ${track.trackName}`} 
                            className="w-full h-full object-cover object-center brightness-85" 
                            referrerPolicy="no-referrer"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />

                          {/* Distintivos superiores */}
                          <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between gap-2 z-10">
                            <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-mono rounded-full border border-white/15 flex items-center gap-1">
                              <MapPin size={10} className="text-amber-400 shrink-0" />
                              <span className="truncate">{location.split('•')[0].trim()}</span>
                            </span>

                            <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-xs">
                              {race.daysAway !== undefined ? `En ${race.daysAway} días` : 'Confirmada'}
                            </span>
                          </div>

                          <div className="absolute bottom-2.5 right-3 z-10">
                            <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md text-emerald-300 text-[10px] font-mono font-bold uppercase rounded border border-white/10">
                              {surface}
                            </span>
                          </div>
                        </div>

                        {/* Cuerpo de la Tarjeta */}
                        <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                          
                          {/* Encabezado del recinto */}
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-xl ${badgeBg} border border-slate-200 shadow-2xs flex items-center justify-center font-mono font-black text-xs shrink-0 overflow-hidden relative`}>
                              <span className="absolute z-0 text-center">{initials}</span>
                              {logoUrl && (
                                <img 
                                  src={logoUrl} 
                                  className="w-full h-full object-contain p-1 bg-white z-10" 
                                  alt={track.trackName}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              )}
                            </div>

                            <div className="min-w-0">
                              <h4 className="text-base font-serif font-black text-slate-950 uppercase tracking-tight leading-snug truncate">
                                {track.trackName}
                              </h4>
                              <p className="text-[11px] text-slate-400 font-mono truncate">{track.domain}</p>
                            </div>
                          </div>

                          {/* Bloque de fecha y descripción */}
                          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-800">
                              <div className="flex items-center gap-1.5">
                                <Calendar size={13} className="text-primary shrink-0" />
                                <span>{race.formattedDate || race.fecha}</span>
                              </div>
                              {race.hora && (
                                <div className="text-[11px] font-mono text-slate-500">
                                  {race.hora} hrs
                                </div>
                              )}
                            </div>

                            <p className="text-xs text-slate-600 font-sans leading-relaxed line-clamp-2 pt-1.5 border-t border-slate-200/60">
                              {race.descripcion || `Reunión de carreras en ${track.trackName} (${surface}).`}
                            </p>
                          </div>

                          {/* Botones de acción */}
                          <div className="space-y-2 pt-1">
                            {showProgram ? (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={async () => {
                                    const trackId = Number(track.trackId);
                                    const url = getOfficialProgramUrl(trackId, race.fecha);
                                    await openInternalBrowser(url);
                                  }}
                                  className="py-2.5 px-3 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-xl uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 shadow-xs transition-all"
                                  title="Abrir Programa Digital PDF Oficial"
                                >
                                  <FileText size={13} className="text-primary" />
                                  <span>Programa</span>
                                </button>

                                <button
                                  onClick={async () => {
                                    const trackId = Number(track.trackId);
                                    const url = getOfficialVolanteUrl(trackId, race.fecha);
                                    await openInternalBrowser(url);
                                  }}
                                  className="py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 shadow-xs transition-all"
                                  title="Abrir Volante Digital PDF Oficial"
                                >
                                  <FileText size={13} className="text-emerald-200" />
                                  <span>Volante</span>
                                </button>
                              </div>
                            ) : (
                              <div className="py-2.5 bg-gray-50 text-gray-400 font-mono text-[11px] font-semibold rounded-xl border border-dashed border-gray-200 text-center uppercase">
                                Programa en preparación
                              </div>
                            )}

                            {/* Sitio oficial con símbolo del recinto */}
                            <button 
                              onClick={async () => await openInternalBrowser(getCleanDomainUrl(track.domain))} 
                              className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] rounded-xl border border-slate-200 uppercase tracking-wider cursor-pointer flex items-center justify-between transition-all group"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div className={`w-5 h-5 rounded-md ${badgeBg} flex items-center justify-center p-0.5 overflow-hidden shrink-0 border border-slate-300`}>
                                  {logoUrl ? (
                                    <img 
                                      src={logoUrl} 
                                      alt={initials} 
                                      className="w-full h-full object-contain bg-white rounded-xs" 
                                      referrerPolicy="no-referrer" 
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                  ) : (
                                    <span className="text-[8px] font-mono font-bold text-white">{initials}</span>
                                  )}
                                </div>
                                <span className="truncate group-hover:text-primary transition-colors">
                                  Sitio Oficial {initials}
                                </span>
                              </div>
                              <ExternalLink size={12} className="text-slate-400 group-hover:text-primary shrink-0 transition-colors" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center bg-white rounded-3xl border border-surface-dim shadow-xs p-8 max-w-lg mx-auto space-y-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 mx-auto">
                    <Calendar size={24} />
                  </div>
                  <h4 className="text-base font-bold text-gray-800 font-serif">
                    No hay programas futuros confirmados
                  </h4>
                  <p className="text-xs text-gray-500 font-sans leading-relaxed">
                    Los hipódromos publican las programaciones definitivas días antes de cada reunión oficial.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Informational Footer */}
          <div className="p-6 bg-white rounded-3xl border border-surface-dim shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2.5 font-mono">
              <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
              <span>Red Oficial de Hipódromos: Hipódromo Chile, Club Hípico de Santiago, Valparaíso Sporting, Club Hípico de Concepción.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
