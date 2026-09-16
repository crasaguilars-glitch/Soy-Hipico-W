import React, { useState } from 'react';
import { Tv, ExternalLink, Play, AlertCircle, Maximize2, Volume2, ShieldCheck, Coins } from 'lucide-react';
import { motion } from 'motion/react';
import { TELETRAK_LIVE_STREAM_URL, openInternalBrowser } from '../../lib/utils';

export default function LiveStreamScreen() {
  const streamUrl = TELETRAK_LIVE_STREAM_URL;
  const [showEmbeddedPlayer, setShowEmbeddedPlayer] = useState(true);

  const handleOpenStreamTab = async () => {
    await openInternalBrowser(streamUrl);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col gap-8 animate-fade-in font-sans">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span>Transmisión Oficial Teletrak TV</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-serif font-black tracking-tight text-gray-950 uppercase flex items-center gap-3">
            <Tv className="text-primary" size={32} />
            <span>Señal en Vivo</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 font-sans mt-1">
            Transmisión en directo de las jornadas hípicas chilenas e internacionales emitidas por Teletrak.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://apuestas.teletrak.cl"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all"
          >
            <Coins size={15} />
            <span>Teletrak Apuestas</span>
          </a>
        </div>
      </div>

      {/* Player Section */}
      <div className="space-y-6">
        {showEmbeddedPlayer ? (
          <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-gray-800">
            <iframe
              src={streamUrl}
              title="Teletrak TV en Vivo"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-none"
            />
            <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
              <button
                onClick={handleOpenStreamTab}
                className="px-3 py-1.5 bg-black/70 hover:bg-black text-white text-[11px] font-bold rounded-xl backdrop-blur-md border border-white/20 flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Maximize2 size={13} />
                <span>Abrir en nueva pestaña</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full aspect-video bg-slate-950 rounded-3xl overflow-hidden shadow-xl border border-gray-800 flex flex-col items-center justify-center group">
            <img 
              src="/hero_horse.png" 
              alt="Hípica en Vivo" 
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover object-center opacity-30 grayscale group-hover:scale-105 transition-transform duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />

            <div className="relative z-10 flex flex-col items-center gap-4 text-center p-6">
              <button
                onClick={() => setShowEmbeddedPlayer(true)}
                className="w-20 h-20 bg-primary hover:bg-primary/90 text-white rounded-3xl flex items-center justify-center shadow-2xl active:scale-95 transition-all group-hover:ring-8 group-hover:ring-primary/20 cursor-pointer"
                aria-label="Reproducir transmisión"
              >
                <Play size={36} fill="currentColor" className="ml-1 text-white" />
              </button>
              
              <div className="space-y-1">
                <p className="text-white font-mono font-bold text-xs uppercase tracking-widest">
                  Reproducir Señal Teletrak TV
                </p>
                <p className="text-gray-400 text-xs font-sans max-w-sm">
                  Haz clic para cargar el reproductor oficial interactivo directamente en esta ventana.
                </p>
              </div>

              <button
                onClick={handleOpenStreamTab}
                className="mt-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 flex items-center gap-1.5 cursor-pointer"
              >
                <span>O abrir directamente en ventana completa</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Action Controls & Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-surface-dim shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase font-mono">
              <AlertCircle size={17} />
              <span>Transmisión en directo</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              La señal oficial es provista por la Red Teletrak Chile. Para silenciar o activar audio en el reproductor, usa el control de volumen ubicado en la esquina inferior del visor de video.
            </p>
          </div>

          <div className="bg-emerald-900 text-white p-6 rounded-3xl shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[10px] font-mono uppercase text-emerald-300 font-bold block">Acceso Rápido</span>
              <h4 className="text-base font-serif font-black uppercase tracking-tight mt-0.5">Pantalla Completa</h4>
              <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed">
                Abre Teletrak TV en una pestaña independiente para mayor comodidad en monitor extendido.
              </p>
            </div>

            <button
              onClick={handleOpenStreamTab}
              className="w-full py-2.5 bg-white text-emerald-950 hover:bg-emerald-50 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
            >
              <span>Abrir en nueva pestaña</span>
              <ExternalLink size={14} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
