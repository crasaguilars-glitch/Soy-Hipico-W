import React from 'react';
import { useAuth } from './providers/FirebaseProvider';
import { getSubscriptionInfo } from '../services/subscription-service';
import PaywallScreen from './screens/PaywallScreen';
import { Loader2, LogIn } from 'lucide-react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export default function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { profile, loading, user, login } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest font-sans">Verificando Acceso...</p>
      </div>
    );
  }

  // Si no hay usuario, invitamos a loguearse
  if (!user) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center space-y-6 max-w-md mx-auto">
        <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary">
          <LogIn size={32} />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-serif font-black text-gray-900 leading-tight">
            Prueba el Acceso Total gratis
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Activa tus <strong>7 días de regalo</strong> para seguir a tus caballos preferidos y estudiar los programas oficiales de carreras.
          </p>
          <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 py-1.5 px-3 rounded-full inline-block border border-emerald-200">
            Sin costo inicial • Acceso inmediato
          </p>
        </div>
        <button
          onClick={login}
          className="px-8 py-3.5 bg-primary text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all uppercase tracking-wider text-xs cursor-pointer hover:bg-primary/90"
        >
          Iniciar sesión con Google
        </button>
      </div>
    );
  }

  const { hasAccess } = getSubscriptionInfo(profile);

  if (!hasAccess) {
    return <PaywallScreen />;
  }

  return <>{children}</>;
}
