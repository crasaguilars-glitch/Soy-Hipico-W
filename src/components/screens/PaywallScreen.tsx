import React, { useState, useEffect } from 'react';
import { Crown, Heart, Calendar, Zap, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth, db } from '../providers/FirebaseProvider';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export default function PaywallScreen() {
  const { user, syncSubscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const [subscriptionPrice, setSubscriptionPrice] = useState<string>('1.500');
  const [fetchingPrice, setFetchingPrice] = useState(true);
  const [subscribedMsg, setSubscribedMsg] = useState(false);

  useEffect(() => {
    const docRef = doc(db, 'system', 'Suscripcion');

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.Valor !== undefined) {
          const valor = typeof data.Valor === 'number'
            ? data.Valor.toLocaleString('es-CL')
            : data.Valor;
          setSubscriptionPrice(valor);
        }
      } else {
        setSubscriptionPrice('1.500');
      }
      setFetchingPrice(false);
    }, (error) => {
      console.warn("[Paywall] Info precio:", error);
      setSubscriptionPrice('1.500');
      setFetchingPrice(false);
    });

    return () => unsubscribe();
  }, []);

  const handleActivateWebAccess = async () => {
    if (!user) {
      alert("Por favor inicia sesión con tu cuenta Google primero.");
      return;
    }

    try {
      setLoading(true);
      const userRef = doc(db, 'users', user.uid);
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);

      await setDoc(userRef, {
        subscriptionStatus: 'active',
        subscriptionExpiry: expiry.toISOString()
      }, { merge: true });

      setSubscribedMsg(true);
      await syncSubscription();
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      alert("Error al activar membresía: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in max-w-lg mx-auto">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-amber-200"
      >
        <Crown size={40} className="text-amber-600 fill-amber-500" />
      </motion.div>

      <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-gray-900 mb-2 leading-tight">
        Acceso Total a Soy Hípico
      </h2>
      <p className="text-sm text-gray-600 max-w-sm mb-8 leading-relaxed">
        Sigue a tus ejemplares favoritos, consulta la programación extendida y recibe notificaciones cuando corran en cualquier recinto de Chile.
      </p>

      <div className="w-full space-y-3 mb-8 text-left">
        <BenefitItem
          icon={<Heart size={20} className="text-red-500" />}
          title="Seguimiento de Regalones"
          description="Sigue a tus caballos preferidos y encuentra automáticamente sus carreras en los programas oficiales."
        />
        <BenefitItem
          icon={<Calendar size={20} className="text-blue-500" />}
          title="Programas Oficiales y Volantes"
          description="Accede a todos los PDFs descargables de Club Hípico de Santiago, Hipódromo Chile, Valparaíso Sporting y Club Hípico de Concepción."
        />
      </div>

      <div className="w-full space-y-4">
        {subscribedMsg ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm">
            <CheckCircle2 size={18} />
            ¡Membresía activada con éxito! Actualizando...
          </div>
        ) : (
          <button
            onClick={handleActivateWebAccess}
            disabled={loading || fetchingPrice}
            className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-primary/20 active:scale-95 transition-all uppercase tracking-widest text-xs sm:text-sm cursor-pointer"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} className="fill-white" />}
            <span>
              {fetchingPrice ? 'Cargando plan...' : `Activar Acceso Completo ($${subscriptionPrice} CLP / Mes)`}
            </span>
          </button>
        )}

        <p className="text-[11px] text-gray-400 font-medium px-4 leading-normal">
          Puedes gestionar tu suscripción y beneficios directamente desde tu perfil de usuario.
        </p>
      </div>
    </div>
  );
}

function BenefitItem({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex gap-4 p-4 bg-white border border-surface-dim rounded-2xl shadow-xs">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight font-sans">{title}</h4>
        <p className="text-[12px] text-gray-500 font-medium leading-relaxed mt-0.5">{description}</p>
      </div>
    </div>
  );
}
