import React from 'react';
import { Trophy, ExternalLink, ArrowLeft, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { getResultsUrl } from '../../lib/utils';

export default function ResultsScreen({ onBack }: { onBack: () => void }) {
  const tracks = [
    {
      id: 3,
      name: "Club Hípico de Santiago",
      initials: "CHS",
      city: "Santiago",
      url: "https://www.clubhipico.cl/carreras/resultados/",
      logo: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Club_H%C3%ADpico_de_Santiago_logo.svg",
      badgeBg: "bg-emerald-600 text-white",
      description: "Resultados oficiales, videos de llegadas y dividendos del Club Hípico de Santiago."
    },
    {
      id: 4,
      name: "Hipódromo Chile",
      initials: "HCH",
      city: "Santiago (Independencia)",
      url: "https://hipodromo.cl/carreras-ultimos-resultados",
      logo: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_Hip%C3%B3dromo_Chile.svg",
      badgeBg: "bg-amber-400 text-black",
      description: "Marcadores oficiales, fallos y tiempos de la jornada en La Palma."
    },
    {
      id: 2,
      name: "Valparaíso Sporting",
      initials: "VSC",
      city: "Viña del Mar",
      url: "https://www.sporting.cl/hipica/front/es/reunion/",
      logo: "https://upload.wikimedia.org/wikipedia/commons/2/23/Valpara%C3%ADso_Sporting_Club_logo.svg",
      badgeBg: "bg-blue-600 text-white",
      description: "Resultados en pista de arena y pasto del Sporting Club de Viña del Mar."
    },
    {
      id: 1,
      name: "Club Hípico de Concepción",
      initials: "CHC",
      city: "Concepción (Hualpén)",
      url: "https://clubhipicoconcepcion.cl/carreras-ultimos-resultados",
      logo: "https://www.google.com/s2/favicons?sz=128&domain=clubhipicoconcepcion.cl",
      badgeBg: "bg-emerald-800 text-white",
      description: "Resultados de las jornadas de Mediocamino en el sur de Chile."
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 animate-fade-in font-sans">
      
      {/* Header and back */}
      <div className="space-y-4">
        <button 
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Volver al Inicio</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-6">
          <div>
            <h2 className="text-2xl sm:text-4xl font-serif font-black text-gray-950 uppercase tracking-tight flex items-center gap-3">
              <Trophy className="text-amber-500 shrink-0" size={32} />
              <span>Resultados Oficiales</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 font-sans mt-1">
              Acceso directo a las pizarras oficiales, fallos, dividendos y videos de las jornadas en los 4 recintos de Chile.
            </p>
          </div>
        </div>
      </div>

      {/* Recintos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tracks.map((recinto) => (
          <motion.div
            key={recinto.id}
            whileHover={{ y: -3 }}
            className="bg-white rounded-3xl border border-surface-dim p-6 sm:p-7 flex flex-col justify-between gap-6 shadow-xs hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl ${recinto.badgeBg} flex items-center justify-center font-mono font-black text-sm shadow-xs shrink-0 overflow-hidden relative`}>
                  <span className="absolute text-center z-0">{recinto.initials}</span>
                  <img
                    src={recinto.logo}
                    className="absolute inset-0 w-full h-full object-contain p-1 bg-white z-10"
                    alt={recinto.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-serif font-bold text-gray-950 group-hover:text-primary transition-colors">
                    {recinto.name}
                  </h3>
                  <span className="text-xs font-mono text-gray-400">{recinto.city}</span>
                </div>
              </div>

              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
                Oficial
              </span>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 font-sans leading-relaxed">
              {recinto.description}
            </p>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-mono text-gray-400">Ver pizarras y fallos</span>
              <a
                href={recinto.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all"
              >
                <span>Consultar Resultados</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Official banner */}
      <div className="p-6 bg-white rounded-3xl border border-surface-dim shadow-xs flex items-center gap-4 text-xs text-gray-500">
        <ShieldCheck size={24} className="text-emerald-700 shrink-0" />
        <p className="leading-relaxed">
          Las pizarras, tiempos registrados, dividendos y marcadores definitivos son fiscalizados y certificados por los comisarios oficiales de cada hipódromo y la red autorizada Teletrak.
        </p>
      </div>

    </div>
  );
}
