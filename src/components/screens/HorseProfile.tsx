import React, { useState, useEffect } from 'react';
import { ChevronLeft, Star, Award, TrendingUp, Loader2, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import axios from 'axios';
import { API_BASE_URL } from '../../api-config';
import { useAppVisibility } from '../../lib/hooks';
import { useAuth, db } from '../providers/FirebaseProvider';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

interface CampaignRow {
  year: string;
  races: string;
  pos1: string;
  pos2: string;
  pos3: string;
  prizes: string;
}

interface Performance {
  hipodromo: string;
  fecha: string;
  tipoCarrera: string;
  premio: string;
  distancia: string;
  jinetePeso?: string;
  jinete?: string;
  lugar: string;
  sumaGanada: any;
  distanciaUnidad?: string;
}

interface HorseProfileData {
  info: any;
  property: any;
  pedigree: any;
}

export default function HorseProfile({ horseId, onBack }: { horseId: string, onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'Campaña' | 'Pedigree' | 'Propiedad'>('Campaña');
  const [campaign, setCampaign] = useState<CampaignRow[]>([]);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [profileData, setProfileData] = useState<HorseProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const { user } = useAuth();
  const isVisible = useAppVisibility();

  // Comprobar si ya es favorito
  useEffect(() => {
    async function checkFavorite() {
      if (!user || !horseId) return;
      try {
        const favRef = doc(db, 'users', user.uid, 'regalones', horseId);
        const snap = await getDoc(favRef);
        setIsFavorite(snap.exists());
      } catch (e) {
        console.warn("Error comprobando regalón:", e);
      }
    }
    checkFavorite();
  }, [user, horseId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!horseId || horseId.length < 2) return; 
      setLoading(true);
      setError(null);
      try {
        const [campRes, profRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/api/horse/campaign/${horseId}`),
          axios.get(`${API_BASE_URL}/api/horse/profile/${horseId}`)
        ]);

        if (campRes.status === 'fulfilled' && campRes.value.data.summary) {
          setCampaign(campRes.value.data.summary);
          if (campRes.value.data.performances) {
            setPerformances(campRes.value.data.performances);
          }
        }
        
        if (profRes.status === 'fulfilled' && profRes.value.data) {
          setProfileData(profRes.value.data);
        }

        if (profRes.status === 'rejected' || (profRes.status === 'fulfilled' && !profRes.value.data.info)) {
          setError("No se pudo obtener información oficial para este ejemplar");
        }
      } catch (err) {
        console.error("Unexpected fetch error:", err);
        setError("Error de conexión al servidor");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [horseId]);

  const toggleFavorite = async () => {
    if (!user) {
      alert("Debes iniciar sesión para agregar ejemplares a Tus Regalones.");
      return;
    }

    try {
      setFavoriteLoading(true);
      const favRef = doc(db, 'users', user.uid, 'regalones', horseId);
      if (isFavorite) {
        await deleteDoc(favRef);
        setIsFavorite(false);
      } else {
        const hName = horseInfo.nombre || 'Ejemplar';
        await setDoc(favRef, {
          id: horseId,
          name: hName,
          addedAt: new Date().toISOString(),
          sire: pedigree?.p_nombre || '',
          dam: pedigree?.m_nombre || '',
          stud: property?.stud?.seudonimo || ''
        });
        setIsFavorite(true);
      }
    } catch (err: any) {
      console.error("Error toggle favorite:", err);
      alert("Error al actualizar regalones: " + err.message);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const horseInfo = profileData?.info?.ejemplar || {};
  const pedigree = profileData?.pedigree || {};
  const property = profileData?.property || {};

  const horse = {
    name: horseInfo.nombre || 'Ejemplar',
    birth: horseInfo.fechaNacimiento?.formato || horseInfo.nacimiento || 'N/A',
    sex: horseInfo.sexo || 'Macho/Hembra',
    color: horseInfo.color || 'Color',
    image: horseInfo.imagen || '/hero_horse.png',
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-3xl border border-surface-dim shadow-xs">
           <Loader2 className="animate-spin text-primary" size={36} />
           <p className="text-xs font-bold text-gray-500 uppercase tracking-widest font-mono">Consultando registro oficial...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="py-16 text-center bg-white rounded-3xl border border-surface-dim px-8">
           <p className="text-gray-500 text-sm italic">{error}</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'Campaña':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Resumen Anual */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-xs border border-surface-dim">
              <div className="p-5 border-b border-surface-dim flex items-center justify-between bg-surface-parchment/60">
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-amber-600" />
                  <h3 className="text-base font-serif font-bold text-primary uppercase">Resumen de Campaña por Año</h3>
                </div>
                <span className="text-xs font-mono text-gray-400">Registro Oficial</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] sm:text-xs uppercase font-bold tracking-wider text-gray-500 border-b border-gray-100">
                      <th className="px-4 py-3.5">Año</th>
                      <th className="px-3 py-3.5 text-center">Carreras</th>
                      <th className="px-3 py-3.5 text-center">1º</th>
                      <th className="px-3 py-3.5 text-center">2º</th>
                      <th className="px-3 py-3.5 text-center">3º</th>
                      <th className="px-4 py-3.5 text-right">Premios</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                    {campaign.length > 0 ? campaign.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-gray-900 font-mono">{row.year}</td>
                        <td className="px-3 py-3.5 text-center font-medium text-gray-700">{row.races}</td>
                        <td className="px-3 py-3.5 text-center">
                          <span className="w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                            {row.pos1}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-center font-medium text-gray-600">{row.pos2}</td>
                        <td className="px-3 py-3.5 text-center font-medium text-gray-600">{row.pos3}</td>
                        <td className="px-4 py-3.5 font-bold text-right tabular-nums text-emerald-800 font-mono">
                          {row.prizes === '-' ? '$0' : row.prizes}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic text-xs">
                          No hay historial de campaña anual registrado para este ejemplar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actuaciones Recientes */}
            {performances.length > 0 && (
              <div className="bg-white rounded-3xl overflow-hidden shadow-xs border border-surface-dim">
                <div className="p-5 border-b border-surface-dim flex items-center justify-between bg-surface-parchment/60">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={18} className="text-primary" />
                    <h3 className="text-base font-serif font-bold text-primary uppercase">Historial de Actuaciones</h3>
                  </div>
                  <span className="text-xs font-mono text-gray-400">{performances.length} carreras registradas</span>
                </div>
                
                {/* Desktop view (Table format) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left font-sans">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] uppercase font-bold tracking-wider text-gray-500 border-b border-gray-100">
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-3 py-3">Hipódromo</th>
                        <th className="px-4 py-3">Premio / Condición</th>
                        <th className="px-3 py-3 text-center">Dist.</th>
                        <th className="px-3 py-3 text-center">Lugar</th>
                        <th className="px-4 py-3 text-right">Premio Obtenido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {performances.map((perf, i) => (
                        <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3.5 font-bold font-mono text-gray-800 whitespace-nowrap">{perf.fecha}</td>
                          <td className="px-3 py-3.5 font-medium text-gray-600">{perf.hipodromo}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900 uppercase truncate max-w-xs">{perf.premio}</span>
                              <span className="text-[11px] text-gray-400 italic truncate max-w-xs">{perf.tipoCarrera}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3.5 text-center font-mono text-gray-700 whitespace-nowrap">
                            {perf.distancia}{perf.distanciaUnidad || 'm'}
                          </td>
                          <td className="px-3 py-3.5 text-center">
                            <span className={cn(
                              "w-6 h-6 inline-flex items-center justify-center rounded-lg text-xs font-black",
                              perf.lugar === '1' ? "bg-amber-400 text-amber-950 shadow-xs" : 
                              perf.lugar === '2' ? "bg-slate-200 text-slate-800" :
                              perf.lugar === '3' ? "bg-amber-100 text-amber-800" :
                              "bg-gray-100 text-gray-600"
                            )}>
                              {perf.lugar}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold tabular-nums text-emerald-800 font-mono whitespace-nowrap">
                            {typeof perf.sumaGanada === 'object' ? `$${perf.sumaGanada.formato}` : (perf.sumaGanada === '0' ? '$0' : `$${parseInt(perf.sumaGanada).toLocaleString('es-CL')}`)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile view */}
                <div className="block sm:hidden divide-y divide-gray-100 font-sans">
                  {performances.map((perf, i) => {
                    const prizeVal = typeof perf.sumaGanada === 'object' 
                      ? `$${perf.sumaGanada.formato}` 
                      : (perf.sumaGanada === '0' ? '$0' : `$${parseInt(perf.sumaGanada).toLocaleString('es-CL')}`);

                    return (
                      <div key={i} className="p-4 hover:bg-gray-50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 flex items-center justify-center rounded-xl text-xs font-black shadow-xs",
                            perf.lugar === '1' ? "bg-amber-400 text-amber-950" : "bg-gray-100 text-gray-700"
                          )}>
                            {perf.lugar || '-'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate uppercase">{perf.premio}</p>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                              {perf.fecha} • {perf.hipodromo} • {perf.distancia}m
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold font-mono text-emerald-800 shrink-0">{prizeVal}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 'Pedigree':
        return (
          <section className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-surface-dim shadow-xs overflow-x-auto">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-serif font-bold text-primary uppercase">Árbol Genealógico Oficial (3 Generaciones)</h3>
                  <p className="text-xs text-gray-500 font-sans">Padres, abuelos y bisabuelos registrados oficialmente</p>
                </div>
              </div>

              {pedigree && pedigree.p_nombre ? (
                <div className="min-w-[700px] flex gap-4">
                  {/* Gen 1: Padres */}
                  <div className="flex-1 flex flex-col justify-around gap-6 py-4">
                     <PedigreeNode name={pedigree.p_nombre} label="Padre (Sire)" color="bg-blue-50/70 border-blue-200" />
                     <PedigreeNode name={pedigree.m_nombre} label="Madre (Dam)" color="bg-rose-50/70 border-rose-200" />
                  </div>
                  {/* Gen 2: Abuelos */}
                  <div className="flex-1 flex flex-col justify-around gap-3 py-2">
                     <PedigreeNode name={pedigree.pp_nombre} label="Abuelo Paterno" size="sm" color="bg-blue-50/40 border-blue-100" />
                     <PedigreeNode name={pedigree.pm_nombre} label="Abuela Paterna" size="sm" color="bg-rose-50/40 border-rose-100" />
                     <PedigreeNode name={pedigree.mp_nombre} label="Abuelo Materno" size="sm" color="bg-blue-50/40 border-blue-100" />
                     <PedigreeNode name={pedigree.mm_nombre} label="Abuela Materna" size="sm" color="bg-rose-50/40 border-rose-100" />
                  </div>
                  {/* Gen 3: Bisabuelos */}
                  <div className="flex-1 flex flex-col justify-around gap-2">
                     <PedigreeNode name={pedigree.ppp_nombre} size="xs" />
                     <PedigreeNode name={pedigree.ppm_nombre} size="xs" />
                     <PedigreeNode name={pedigree.pmp_nombre} size="xs" />
                     <PedigreeNode name={pedigree.pmm_nombre} size="xs" />
                     <PedigreeNode name={pedigree.mpp_nombre} size="xs" />
                     <PedigreeNode name={pedigree.mpm_nombre} size="xs" />
                     <PedigreeNode name={pedigree.mmp_nombre} size="xs" />
                     <PedigreeNode name={pedigree.mmm_nombre} size="xs" />
                  </div>
                </div>
              ) : (
                <p className="text-center py-12 text-gray-400 italic text-sm">Información de pedigrí no disponible para este ejemplar.</p>
              )}
            </div>
          </section>
        );

      case 'Propiedad': {
        const transf = property.transferencia;
        return (
          <section className="space-y-6 animate-fade-in">
             <div className="bg-white rounded-3xl border border-surface-dim overflow-hidden shadow-xs">
                <div className="bg-gray-50 p-6 border-b border-surface-dim">
                   <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800">Stud Propietario Actual</span>
                   <h4 className="text-2xl font-serif font-black text-gray-950 uppercase mt-1">{property.stud?.seudonimo || 'No registrado'}</h4>
                </div>
                
                {property.propietarios && property.propietarios.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans">
                      <thead>
                        <tr className="bg-gray-100/60 text-[10px] uppercase font-bold tracking-wider text-gray-500">
                          <th className="px-6 py-3">Propietario / Socio</th>
                          <th className="px-6 py-3 text-right">Participación (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                        {property.propietarios.map((p: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-6 py-3.5 font-medium text-gray-800">{p.nombre}</td>
                            <td className="px-6 py-3.5 text-right font-bold text-primary font-mono">{p.porcentaje}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-gray-400 italic">
                    Sin detalle de socios propietarios registrado.
                  </div>
                )}

                <div className="p-6 bg-surface-parchment/60 border-t border-surface-dim space-y-3">
                   <h5 className="text-xs font-bold uppercase tracking-wider text-gray-700 font-mono">Última Transferencia Oficial</h5>
                   {transf ? (
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-2xl border border-surface-dim gap-3">
                        <div>
                           <span className="text-[10px] font-bold text-gray-400 uppercase">Fecha Ingreso</span>
                           <p className="text-xs font-bold font-mono text-gray-900">{transf.fechaIngreso || transf.fecha}</p>
                        </div>
                        <div className="sm:text-right">
                           <span className="text-[10px] font-bold text-gray-400 uppercase">Nº Certificado</span>
                           <p className="text-xs font-bold font-mono text-emerald-800">{transf.numeroTransferencia}</p>
                        </div>
                     </div>
                   ) : (
                     <p className="text-xs text-gray-400 italic">No hay registro de transferencias recientes en la ficha.</p>
                   )}
                </div>
             </div>
          </section>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen animate-fade-in pb-20 w-full">
      
      {/* Hero Header */}
      <section className="relative h-[260px] sm:h-[320px] w-full overflow-hidden shadow-md">
        <img 
          src={horse.image} 
          alt={horse.name} 
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
        
        <div className="absolute top-6 left-4 sm:left-8 right-4 sm:right-8 flex items-center justify-between z-20">
          <button 
            onClick={onBack}
            className="w-10 h-10 sm:w-11 sm:h-11 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20 transition-all cursor-pointer"
            id="back-to-search-btn"
          >
            <ChevronLeft size={22} />
          </button>

          <div className="flex items-center gap-2">
            <a
              href={`https://www.studbookdechile.cl/resumen_campana.php?ejemplar=${horseId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-2xl text-white border border-white/20 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Ficha Oficial</span>
            </a>

            <button
              onClick={toggleFavorite}
              disabled={favoriteLoading}
              className={cn(
                "px-3.5 py-2 backdrop-blur-md rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border",
                isFavorite 
                  ? "bg-amber-500 text-black border-amber-400 font-black shadow-md" 
                  : "bg-black/40 hover:bg-black/60 text-white border-white/20"
              )}
            >
              <Star size={14} className={isFavorite ? "fill-black text-black" : "text-white"} />
              <span>{isFavorite ? 'En Regalones' : 'Seguir'}</span>
            </button>
          </div>
        </div>

        <div className="absolute bottom-6 left-4 sm:left-8 right-4 sm:right-8 max-w-5xl mx-auto flex flex-col justify-end">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 rounded-md w-fit mb-2">
            RUT OFICIAL: {horseId}
          </span>
          <h2 className="text-3xl sm:text-5xl text-white font-serif font-black uppercase tracking-tight leading-tight">
            {horse.name}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-white/90 text-xs font-medium font-sans mt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary" />
              Nacimiento: {horse.birth}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {horse.sex} • {horse.color}
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-6 -mt-4 relative z-10">
        
        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-surface-dim p-1.5 flex gap-1 font-sans">
          {(['Campaña', 'Pedigree', 'Propiedad'] as const).map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all flex-1 text-center rounded-xl cursor-pointer",
                activeTab === tab 
                  ? "text-white bg-primary shadow-sm" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Dynamic Tab Body */}
        <div className="min-h-[400px]">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

function PedigreeNode({ name, label, size = 'default', color }: { name?: string, label?: string, size?: 'default' | 'sm' | 'xs', color?: string }) {
  if (!name) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-2 flex items-center justify-center min-h-[36px]">
        <span className="text-[9px] text-gray-400 italic">No registrado</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border p-3 flex flex-col gap-0.5 shadow-2xs font-sans transition-all",
      size === 'sm' ? "p-2" : size === 'xs' ? "p-1.5" : "p-3",
      color || "bg-gray-50 border-gray-200"
    )}>
      {label && <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 font-mono">{label}</span>}
      <span className={cn(
        "font-serif font-bold uppercase text-gray-900 truncate",
        size === 'sm' ? "text-[11px]" : size === 'xs' ? "text-[9px]" : "text-xs"
      )}>
        {name}
      </span>
    </div>
  );
}
