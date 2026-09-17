import React from 'react';
import { Tv, ExternalLink, Play, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function LiveStreamScreen() {
  const streamUrl = "https://teletraktv.janus.cl/player2/player_teletrak.html?autoplay=yes&muted=yes";

  const handleOpenStream = async () => {
     const win = window.open(streamUrl, "_blank");
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface-parchment animate-fade-in pb-32">
      <div className="p-6">
        <h2 className="text-2xl font-serif font-black tracking-tight flex items-center gap-2">
          <Tv className="text-primary" size={26} />
          <span>Señal en Vivo</span>
        </h2>
        <p className="text-xs text-on-surface-variant font-medium mt-1">
          Accede a la transmisión oficial de Teletrak TV.
        </p>
      </div>

      <div className="px-6 flex flex-col gap-6">
        {/* Visual Preview / Hero */}
        <div className="relative w-full aspect-video bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white flex flex-col items-center justify-center group">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1599427303058-f04cbcf4756f?auto=format&fit=crop&q=80&w=800')] bg-cover bg-center opacity-40 grayscale group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

          <button
            onClick={handleOpenStream}
            className="relative z-10 w-20 h-20 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all group-hover:ring-8 group-hover:ring-primary/20"
          >
            <Play size={40} fill="currentColor" className="ml-1" />
          </button>

          <div className="absolute bottom-6 left-0 right-0 text-center">
            <p className="text-white font-black text-xs uppercase tracking-[0.2em]">Pulsar para iniciar transmisión</p>
          </div>
        </div>

        {/* Action Info */}
        <div className="space-y-4">
          <button
            onClick={handleOpenStream}
            className="w-full py-5 bg-primary text-white rounded-3xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all"
          >
            <span>Abrir Teletrak TV</span>
            <ExternalLink size={20} />
          </button>

          <div className="bg-white p-6 rounded-[2rem] border border-surface-dim shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-primary">
               <AlertCircle size={18} />
               <h3 className="font-bold text-[10px] uppercase tracking-wider">Instrucciones de Uso</h3>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              La señal se abrirá en una ventana optimizada de tu navegador para garantizar la mejor calidad de video y audio. Al terminar, simplemente cierra la ventana para volver a la aplicación.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
