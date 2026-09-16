import React, { useState } from 'react';
import { Search, Home as HomeIcon, Calendar, User, Menu, Heart, Tv, Trophy, X, Shield, Sparkles } from 'lucide-react';
import { cn, TELETRAK_LIVE_STREAM_URL } from './lib/utils';
import HomeScreen from './components/screens/Home';
import SearchScreen from './components/screens/Search';
import ProgramsScreen from './components/screens/Programs';
import HorseProfile from './components/screens/HorseProfile';
import ResultsScreen from './components/screens/Results';
import TusRegalonesScreen from './components/screens/TusRegalones';
import LiveStreamScreen from './components/screens/LiveStream';
import { AIAssistant } from './components/AIAssistant';
import { FirebaseProvider, useAuth } from './components/providers/FirebaseProvider';

export type View = 'home' | 'search' | 'programs' | 'profile' | 'results' | 'regalones' | 'live';

export default function App() {
  return (
    <FirebaseProvider>
      <AppContent />
    </FirebaseProvider>
  );
}

function AppContent() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [initialProgramsFilter, setInitialProgramsFilter] = useState<'today' | 'upcoming'>('today');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);

  const { user, logout } = useAuth();

  const navigateToProfile = (id: string) => {
    setSelectedHorseId(id);
    setCurrentView('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToProgramsFilter = (filter: 'today' | 'upcoming') => {
    setInitialProgramsFilter(filter);
    setCurrentView('programs');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchView = (view: View) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return (
          <HomeScreen 
            onNavigateSearch={() => switchView('search')} 
            onNavigatePrograms={navigateToProgramsFilter}
            onNavigateResults={() => switchView('results')}
            onNavigateLive={() => switchView('live')}
            onNavigateRegalones={() => switchView('regalones')}
          />
        );
      case 'search':
        return <SearchScreen onSelectHorse={navigateToProfile} />;
      case 'programs':
        return <ProgramsScreen defaultFilter={initialProgramsFilter} />;
      case 'regalones':
        return <TusRegalonesScreen onSelectHorse={navigateToProfile} />;
      case 'profile':
        return <HorseProfile horseId={selectedHorseId || '1'} onBack={() => switchView('search')} />;
      case 'results':
        return <ResultsScreen onBack={() => switchView('home')} />;
      case 'live':
        return <LiveStreamScreen />;
      default:
        return (
          <HomeScreen 
            onNavigateSearch={() => switchView('search')} 
            onNavigatePrograms={navigateToProgramsFilter}
            onNavigateResults={() => switchView('results')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-parchment text-on-surface antialiased selection:bg-primary selection:text-white font-sans">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-surface-dim shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => switchView('home')}
              className="flex items-center gap-3 cursor-pointer group text-left"
              aria-label="Ir a Inicio"
            >
              <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-amber-300 font-serif font-black text-xl shadow-xs group-hover:scale-105 transition-transform">
                H
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-serif font-black tracking-tight text-gray-950 uppercase leading-none group-hover:text-primary transition-colors">
                  Soy Hípico
                </span>
                <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-800 font-bold mt-0.5">
                  Hípica Chilena Oficial
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            <NavTab 
              active={currentView === 'home'} 
              label="Inicio" 
              icon={<HomeIcon size={16} />} 
              onClick={() => switchView('home')} 
            />
            <NavTab 
              active={currentView === 'search' || currentView === 'profile'} 
              label="Buscar Ejemplares" 
              icon={<Search size={16} />} 
              onClick={() => switchView('search')} 
            />
            <NavTab 
              active={currentView === 'programs'} 
              label="Programas" 
              icon={<Calendar size={16} />} 
              onClick={() => switchView('programs')} 
            />
            <NavTab 
              active={currentView === 'regalones'} 
              label="Tus Regalones" 
              icon={<Heart size={16} />} 
              onClick={() => switchView('regalones')} 
            />
            <NavTab 
              active={currentView === 'results'} 
              label="Resultados" 
              icon={<Trophy size={16} />} 
              onClick={() => switchView('results')} 
            />
            <NavTab 
              active={currentView === 'live'} 
              label="En Vivo" 
              icon={<Tv size={16} />} 
              badge="LIVE"
              onClick={() => switchView('live')} 
            />
          </nav>

          {/* Right Action Icons & Mobile Menu Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => switchView('live')}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-mono font-bold uppercase tracking-wider border border-red-200 transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <span>Teletrak TV</span>
            </button>

            <button 
              onClick={() => setUserModalOpen(true)}
              className="p-2.5 text-gray-700 hover:text-primary hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              title="Perfil de Usuario"
              aria-label="Perfil"
            >
              <User size={20} />
            </button>

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 text-gray-700 hover:text-primary hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Abrir Menú"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-surface-dim px-4 py-4 space-y-1 shadow-lg animate-slide-up">
            <MobileNavItem 
              active={currentView === 'home'} 
              label="Inicio" 
              icon={<HomeIcon size={18} />} 
              onClick={() => switchView('home')} 
            />
            <MobileNavItem 
              active={currentView === 'search' || currentView === 'profile'} 
              label="Buscar Ejemplares" 
              icon={<Search size={18} />} 
              onClick={() => switchView('search')} 
            />
            <MobileNavItem 
              active={currentView === 'programs'} 
              label="Programas de Carreras" 
              icon={<Calendar size={18} />} 
              onClick={() => switchView('programs')} 
            />
            <MobileNavItem 
              active={currentView === 'regalones'} 
              label="Tus Regalones" 
              icon={<Heart size={18} />} 
              onClick={() => switchView('regalones')} 
            />
            <MobileNavItem 
              active={currentView === 'results'} 
              label="Resultados Oficiales" 
              icon={<Trophy size={18} />} 
              onClick={() => switchView('results')} 
            />
            <MobileNavItem 
              active={currentView === 'live'} 
              label="Señal en Vivo (Teletrak)" 
              icon={<Tv size={18} />} 
              onClick={() => switchView('live')} 
            />
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {renderView()}
      </main>

      {/* AI Assistant Floating Widget */}
      <AIAssistant />

      {/* Mobile Bottom Bar for Fast Touch Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-surface-dim px-2 py-2 flex items-center justify-around shadow-lg">
        <MobileBottomTab 
          active={currentView === 'home'} 
          icon={<HomeIcon size={20} />} 
          label="Inicio" 
          onClick={() => switchView('home')} 
        />
        <MobileBottomTab 
          active={currentView === 'search' || currentView === 'profile'} 
          icon={<Search size={20} />} 
          label="Buscar" 
          onClick={() => switchView('search')} 
        />
        <MobileBottomTab 
          active={currentView === 'regalones'} 
          icon={<Heart size={20} />} 
          label="Regalones" 
          onClick={() => switchView('regalones')} 
        />
        <MobileBottomTab 
          active={currentView === 'live'} 
          icon={<Tv size={20} />} 
          label="En Vivo" 
          onClick={() => switchView('live')} 
        />
        <MobileBottomTab 
          active={currentView === 'programs'} 
          icon={<Calendar size={20} />} 
          label="Programas" 
          onClick={() => switchView('programs')} 
        />
      </nav>

      {/* Footer */}
      <footer className="bg-white border-t border-surface-dim mt-auto py-10 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-gray-500 font-sans">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary text-amber-300 flex items-center justify-center font-serif font-black text-sm">
              H
            </div>
            <div>
              <p className="font-serif font-bold text-gray-900 text-sm">SOY HÍPICO • PLATAFORMA WEB</p>
              <p className="text-[11px] text-gray-400">Información consolidada de la hípica chilena oficial.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono">
            <a 
              href="https://www.studbookdechile.cl" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-primary hover:underline"
            >
              Registro Genealógico Oficial
            </a>
            <span>•</span>
            <a 
              href="https://www.clubhipico.cl" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-primary hover:underline"
            >
              Club Hípico de Santiago
            </a>
            <span>•</span>
            <a 
              href="https://www.hipodromochile.cl" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-primary hover:underline"
            >
              Hipódromo Chile
            </a>
            <span>•</span>
            <a 
              href="https://www.sporting.cl" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-primary hover:underline"
            >
              Valparaíso Sporting
            </a>
            <span>•</span>
            <a 
              href={TELETRAK_LIVE_STREAM_URL} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-red-700 hover:text-red-800 font-bold hover:underline inline-flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              <span>Señal en Vivo Teletrak</span>
            </a>
          </div>
        </div>
      </footer>

      {/* User info modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-surface-dim shadow-2xl space-y-6 relative">
            <button 
              onClick={() => setUserModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 p-1.5 rounded-xl hover:bg-gray-100 cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-primary text-white text-2xl font-serif font-black flex items-center justify-center mx-auto shadow-sm">
                {user?.displayName ? user.displayName[0].toUpperCase() : 'H'}
              </div>
              <h3 className="text-xl font-serif font-bold text-gray-900">
                {user ? user.displayName || 'Aficionado Hípico' : 'Acceso de Usuario'}
              </h3>
              <p className="text-xs text-gray-500 font-sans">
                {user ? user.email : 'Sincroniza tus ejemplares favoritos y configuraciones.'}
              </p>
            </div>

            {user ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Estado:</span>
                    <span className="font-bold text-emerald-700">Conectado</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Cuenta:</span>
                    <span className="font-mono text-gray-700 truncate max-w-[180px]">{user.email}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    logout();
                    setUserModalOpen(false);
                  }}
                  className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                >
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setUserModalOpen(false);
                    switchView('regalones');
                  }}
                  className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Ir a Mis Regalones
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

function NavTab({ 
  active, 
  label, 
  icon, 
  badge, 
  onClick 
}: { 
  active: boolean; 
  label: string; 
  icon: React.ReactNode; 
  badge?: string; 
  onClick: () => void; 
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer relative",
        active 
          ? "bg-primary text-white shadow-xs" 
          : "text-gray-600 hover:text-gray-950 hover:bg-gray-100"
      )}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {badge && (
        <span className={cn(
          "px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-tight",
          active ? "bg-amber-400 text-black" : "bg-red-100 text-red-700"
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

function MobileNavItem({ 
  active, 
  label, 
  icon, 
  onClick 
}: { 
  active: boolean; 
  label: string; 
  icon: React.ReactNode; 
  onClick: () => void; 
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-3 cursor-pointer text-left",
        active 
          ? "bg-primary text-white shadow-xs" 
          : "text-gray-700 hover:bg-gray-100"
      )}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function MobileBottomTab({ 
  active, 
  icon, 
  label, 
  onClick 
}: { 
  active: boolean; 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void; 
}) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer",
        active ? "text-primary font-bold" : "text-gray-500 hover:text-gray-900"
      )}
    >
      <div className={cn("transition-transform", active && "scale-110")}>
        {icon}
      </div>
      <span className="text-[10px] font-mono uppercase tracking-tight">
        {label}
      </span>
    </button>
  );
}
