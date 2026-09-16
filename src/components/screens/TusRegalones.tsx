import React, { useState, useEffect } from 'react';
import { Heart, Search, Trash2, Loader2, Calendar, LogIn, LogOut, Info, AlertTriangle, User, Mail, Zap, ExternalLink, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, openInternalBrowser } from '../../lib/utils';
import { db, useAuth } from '../providers/FirebaseProvider';
import { collection, query, where, addDoc, deleteDoc, doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import axios from 'axios';
import { API_BASE_URL } from '../../api-config';
import { useAppVisibility } from '../../lib/hooks';

interface TrackedHorse {
  id: string;
  name: string;
  rut?: string;
  userEmail: string;
}

interface RaceMatch {
  horseName: string;
  trackName: string;
  trackId: number;
  date: string;
  carrera: number;
  pdfUrl: string;
  isSimulated?: boolean;
}

interface SimpleUser {
  name: string;
  email: string;
}

export default function TusRegalonesScreen({ onSelectHorse }: { onSelectHorse: (id: string) => void }) {
  const isVisible = useAppVisibility();
  const { user: firebaseUser, profile, logout: firebaseLogout } = useAuth();
  const [user, setUser] = useState<SimpleUser | null>(null);

  const maxFavorites = 8;
  const [nickInput, setNickInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [favorites, setFavorites] = useState<TrackedHorse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [upcomingMatches, setUpcomingMatches] = useState<RaceMatch[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittingFavoriteId, setSubmittingFavoriteId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [scraperLogs, setScraperLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [searchDisabled, setSearchDisabled] = useState(false);

  // 1. Cargar usuario de caché local o de Firebase global
  useEffect(() => {
    if (firebaseUser) {
      setUser({
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
        email: firebaseUser.email || ''
      });
      return;
    }

    const savedUser = localStorage.getItem('soy_hipico_user_simple');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch (e) {
        console.error("Error cargando usuario de cache", e);
      }
    }
  }, [firebaseUser]);

  // 2. Registro o Ingreso Simple (basado en correo)
  const handleSimpleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailInput.trim().toLowerCase();
    const name = nickInput.trim();

    if (!name || !email) {
      setErrorMessage("Ingresa nick y correo para continuar.");
      return;
    }

    setAuthLoading(true);
    setErrorMessage(null);

    const newUser: SimpleUser = { name, email };

    try {
      const userRef = doc(db, 'users', email.replace(/[^a-z0-9]/g, '_'));
      localStorage.setItem('soy_hipico_user_simple', JSON.stringify(newUser));
      setUser(newUser);

      setDoc(userRef, {
        name: name,
        email: email,
        uid: email.replace(/[^a-z0-9]/g, '_'),
        lastLogin: new Date().toISOString(),
        provider: 'simple-auth'
      }, { merge: true }).catch(err => console.warn("Firestore sync deferred:", err));

    } catch (err: any) {
      console.error("Auth process error:", err);
      setUser(newUser);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    if (firebaseUser) {
      firebaseLogout();
    }
    localStorage.removeItem('soy_hipico_user_simple');
    setUser(null);
    setNickInput('');
    setEmailInput('');
    setSearchResults([]);
    setUpcomingMatches([]);
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("¿Estás seguro de que deseas eliminar tu cuenta? Esta acción borrará todos tus regalones.");
    if (!confirmDelete || !user) return;

    try {
      setAuthLoading(true);
      const horseDocs = favorites.map(f => deleteDoc(doc(db, 'horses', f.id)));
      await Promise.all(horseDocs);

      const userRef = doc(db, 'users', user.email.replace(/[^a-z0-9]/g, '_'));
      await deleteDoc(userRef);

      handleLogout();
      alert("Tu cuenta y tus datos han sido eliminados exitosamente.");
    } catch (error) {
      console.error("Error eliminando cuenta:", error);
      alert("Hubo un error al intentar eliminar la cuenta.");
    } finally {
      setAuthLoading(false);
    }
  };

  // 3. Escuchar caballos favoritos
  useEffect(() => {
    if (!user || !isVisible) return;
    const q = query(collection(db, 'horses'), where('userEmail', '==', user.email));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: TrackedHorse[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({ id: doc.id, name: data.name, rut: data.rut, userEmail: data.userEmail });
      });
      const unique = Array.from(new Map(items.map(h => [h.name.toUpperCase(), h])).values());
      setFavorites(unique.slice(0, maxFavorites));
    }, (error) => {
      console.error("Error al obtener regalones:", error);
    });
    return () => unsubscribe();
  }, [user, isVisible]);

  // 4. Búsqueda de ejemplares
  const executeSearch = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const queryTerm = searchQuery
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    if (!queryTerm || searchLoading) return;

    setSearchLoading(true);
    setErrorMessage(null);
    setSearchResults([]);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/search?q=${encodeURIComponent(queryTerm)}`, {
        timeout: 15000
      });

      const results = response.data.results || [];
      if (results.length === 0) {
        setErrorMessage(`No se encontraron resultados para "${queryTerm}"`);
      }
      setSearchResults(results);
    } catch (err: any) {
      console.error("[Search] Error fatal:", err);
      setErrorMessage("No se pudo conectar con el servidor. Reintente en un momento.");
    } finally {
      setSearchLoading(false);
    }
  };

  // 5. Scraper de presentaciones próximas
  useEffect(() => {
    if (favorites.length === 0 || !user || !isVisible) {
      setUpcomingMatches([]);
      setScraperLogs([]);
      return;
    }

    const fetchMatches = async () => {
      setTrackingLoading(true);
      const initialLogs: string[] = [];
      const addLocalLog = (msg: string) => {
        const time = new Date().toLocaleTimeString('es-CL');
        initialLogs.push(`[${time}] ${msg}`);
        if (showLogs) {
          setScraperLogs([...initialLogs]);
        }
      };

      addLocalLog(`Iniciando monitoreo de ${favorites.length} regalones...`);

      try {
        const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const loadedMatches: RaceMatch[] = [];
        const uncachedFavorites: TrackedHorse[] = [];

        for (const fav of favorites) {
          const horseU = fav.name.trim().toUpperCase();
          const docId = horseU.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
          const cacheRef = doc(db, 'horses_cache', docId);

          try {
            const docSnap = await getDoc(cacheRef);
            if (docSnap.exists()) {
              const cachedData = docSnap.data();
              if (cachedData && cachedData.expiresAt && todayStr <= cachedData.expiresAt) {
                addLocalLog(`${fav.name}: Cargado desde caché.`);
                if (Array.isArray(cachedData.matches)) loadedMatches.push(...cachedData.matches);
                continue;
              }
            }
            uncachedFavorites.push(fav);
          } catch (e) {
            uncachedFavorites.push(fav);
          }
        }

        if (uncachedFavorites.length > 0) {
          addLocalLog(`Buscando ${uncachedFavorites.length} ejemplares en programas...`);
          const namesString = uncachedFavorites.map(f => f.name).join(',');
          const response = await axios.get(`${API_BASE_URL}/api/favorites/upcoming?names=${encodeURIComponent(namesString)}&today=${todayStr}`);
          const apiResults: RaceMatch[] = response.data.results || [];
          if (Array.isArray(response.data.logs)) initialLogs.push(...response.data.logs);

          for (const fav of uncachedFavorites) {
            const horseU = fav.name.trim().toUpperCase();
            const docId = horseU.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
            const horseMatches = apiResults.filter(m => m.horseName.toUpperCase() === horseU);
            loadedMatches.push(...horseMatches);

            let expiresAtDate = "2000-01-01";
            if (horseMatches.length > 0) {
              expiresAtDate = horseMatches[0].date;
            } else {
              const now = new Date();
              const hour = now.getHours();
              const expiration = new Date();
              if (hour < 14) {
                expiration.setHours(14, 0, 0, 0);
              } else {
                expiration.setHours(hour + 2);
              }
              expiresAtDate = expiration.toISOString();
            }

            setDoc(doc(db, 'horses_cache', docId), {
              horseName: horseU,
              cacheDate: todayStr,
              expiresAt: expiresAtDate,
              matches: horseMatches,
              createdAt: new Date().toISOString()
            }).catch(() => {});
          }
        }

        const group: Record<string, RaceMatch[]> = {};
        loadedMatches.forEach(m => {
          const key = m.horseName.trim().toUpperCase();
          if (!group[key]) group[key] = [];
          group[key].push(m);
        });

        const todayTime = new Date(todayStr + "T00:00:00").getTime();
        const filtered = Object.keys(group).map(key => {
          return group[key].sort((a, b) => {
            const distA = Math.abs(new Date(a.date + "T00:00:00").getTime() - todayTime);
            const distB = Math.abs(new Date(b.date + "T00:00:00").getTime() - todayTime);
            return distA - distB;
          })[0];
        });

        setUpcomingMatches(filtered);
        addLocalLog(`Búsqueda completada. ${filtered.length} carreras detectadas.`);
        if (!showLogs) setScraperLogs(initialLogs);
      } catch (err: any) {
        addLocalLog(`Error en el monitoreo: ${err.message}`);
        if (!showLogs) setScraperLogs(initialLogs);
        console.error("Match error:", err);
      } finally {
        setTrackingLoading(false);
      }
    };

    fetchMatches();
  }, [favorites, user, isVisible]);

  const enrollHorse = async (horseName: string, horseId: string) => {
    if (!user) return;
    const cleanName = horseName.trim().toUpperCase();

    if (favorites.length >= maxFavorites) {
      setErrorMessage(`Has alcanzado el límite de ${maxFavorites} regalones permitidos.`);
      return;
    }
    if (favorites.some(f => f.name.toUpperCase() === cleanName)) return;

    try {
      setSubmittingFavoriteId(horseName);
      await addDoc(collection(db, 'horses'), {
        userEmail: user.email,
        name: cleanName,
        rut: horseId,
        addedAt: new Date().toISOString()
      });
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      setErrorMessage("Error al guardar favorito.");
    } finally {
      setSubmittingFavoriteId(null);
    }
  };

  const removeHorse = async (favoriteId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'horses', favoriteId));
    } catch (err) {
      console.error(err);
    }
  };

  const formatDateSpanish = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
      const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}`;
    } catch { return dateStr; }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col gap-8 animate-fade-in font-sans">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <Heart size={13} className="fill-rose-600 text-rose-600" />
            <span>Monitoreo Activo de Programas</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-serif font-black tracking-tight text-gray-950 uppercase flex items-center gap-3">
            <span>Tus Regalones</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 font-sans mt-1">
            Sigue a tus ejemplares predilectos. El sistema cruzará automáticamente los programas publicados para notificarte cuándo y dónde correrán.
          </p>
        </div>

        {user && (
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-surface-dim shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm">
              {user.name[0].toUpperCase()}
            </div>
            <div className="pr-2">
              <p className="font-bold text-xs text-gray-900 leading-tight">{user.name}</p>
              <p className="text-[10px] text-gray-400 font-mono">{user.email}</p>
            </div>
            <button 
              onClick={handleLogout} 
              title="Cerrar sesión"
              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!user ? (
          /* PANTALLA DE REGISTRO / LOGIN */
          <motion.div 
            key="auth" 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="bg-white p-8 sm:p-10 rounded-3xl border border-surface-dim shadow-xs space-y-6 max-w-md mx-auto w-full"
          >
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Heart size={28} className="fill-rose-500" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-gray-900">Ingreso a Regalones</h3>
              <p className="text-xs text-gray-500">
                Identifícate con tu nombre o correo para guardar tus ejemplares y recordarlos en futuras visitas.
              </p>
            </div>

            <form onSubmit={handleSimpleAuth} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase text-gray-500 mb-1">Nombre o Apodo</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      required 
                      placeholder="Ej: Criador77" 
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-primary focus:bg-white transition-colors" 
                      value={nickInput} 
                      onChange={e => setNickInput(e.target.value)} 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase text-gray-500 mb-1">Correo Electrónico</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="email" 
                      required 
                      placeholder="tu@correo.cl" 
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-primary focus:bg-white transition-colors" 
                      value={emailInput} 
                      onChange={e => setEmailInput(e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={authLoading} 
                className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                {authLoading ? <Loader2 className="animate-spin" size={16} /> : <LogIn size={16} />}
                <span>Ingresar a Mis Regalones</span>
              </button>
            </form>
          </motion.div>
        ) : (
          /* PANTALLA PRINCIPAL DE CONTENIDO */
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            
            {/* INSCRIBIR CABALLO */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-surface-dim shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 font-mono">
                    Inscribir Nuevo Ejemplar
                  </h3>
                  <p className="text-xs text-gray-500 font-sans">
                    Busca por nombre en el registro oficial para agregarlo a tu lista de monitoreo.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  {favorites.length} / {maxFavorites} Inscritos
                </span>
              </div>

              <form onSubmit={executeSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Escribe el nombre del caballo (ej: Kay Army, Wow King)..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-3.5 text-xs sm:text-sm font-medium outline-none focus:bg-white focus:border-primary transition-all"
                    value={searchQuery}
                    onChange={e => {
                      const cleanVal = e.target.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                      setSearchQuery(cleanVal);
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchLoading || searchDisabled}
                  className="bg-primary hover:bg-primary/90 text-white px-6 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {searchLoading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                  <span className="hidden sm:inline">Buscar</span>
                </button>
              </form>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Resultados de búsqueda */}
              {searchResults.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 max-h-72 overflow-y-auto space-y-1.5 animate-slide-up">
                  <div className="text-[10px] font-mono font-bold text-primary uppercase px-2 py-1 tracking-wider">
                    Resultados encontrados ({searchResults.length})
                  </div>
                  {searchResults.map(h => {
                    const isFav = favorites.some(f => f.name.toUpperCase() === h.name.toUpperCase());
                    return (
                      <div key={h.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 hover:border-primary/40 transition-colors">
                        <div>
                          <p className="text-xs sm:text-sm font-serif font-black uppercase text-gray-900">{h.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{h.subtitle || `RUT: ${h.id}`}</p>
                        </div>
                        <button
                          onClick={() => enrollHorse(h.name, h.id)}
                          disabled={isFav || submittingFavoriteId === h.name}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
                            isFav
                              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                              : "bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                          )}
                        >
                          {submittingFavoriteId === h.name ? <Loader2 size={13} className="animate-spin" /> : isFav ? "Ya Inscrito" : "Inscribir"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* LISTADO DE REGALONES */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-700">
                    Mis Ejemplares Monitoreados ({favorites.length})
                  </h3>
                  <button
                    onClick={() => setShowLogs(!showLogs)}
                    className="text-[11px] font-mono text-gray-400 hover:text-primary flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Terminal size={12} />
                    <span>{showLogs ? "Ocultar Log" : "Diagnóstico"}</span>
                  </button>
                </div>

                {trackingLoading && (
                  <div className="flex items-center gap-2 text-xs font-mono text-primary font-bold">
                    <Loader2 className="animate-spin" size={14} />
                    <span className="hidden sm:inline">Rastreando en programas oficiales...</span>
                  </div>
                )}
              </div>

              {showLogs && scraperLogs.length > 0 && (
                <div className="bg-gray-950 text-emerald-400 p-4 rounded-2xl font-mono text-[10px] max-h-48 overflow-y-auto space-y-1 shadow-inner border border-gray-800">
                  {scraperLogs.map((log, idx) => (
                    <div key={idx} className="border-b border-gray-900 py-0.5 last:border-0">{log}</div>
                  ))}
                </div>
              )}

              {favorites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {favorites.map(fav => {
                    const match = upcomingMatches.find(m => m.horseName.toUpperCase() === fav.name.toUpperCase());
                    return (
                      <div 
                        key={fav.id} 
                        className="bg-white rounded-3xl border border-surface-dim p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <button
                              onClick={() => onSelectHorse(fav.rut || fav.name)}
                              className="text-lg font-serif font-black uppercase text-gray-950 hover:text-primary transition-colors text-left cursor-pointer"
                            >
                              {fav.name}
                            </button>
                            {fav.rut && (
                              <p className="text-[10px] text-gray-400 font-mono mt-0.5">RUT Oficial: {fav.rut}</p>
                            )}
                          </div>
                          <button 
                            onClick={() => removeHorse(fav.id)} 
                            title="Eliminar de regalones"
                            className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Match presentation card */}
                        <div className="bg-gray-50/90 rounded-2xl p-4 border border-gray-100 space-y-2.5">
                          {match ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                  Carrera Confirmada
                                </span>
                                {match.carrera && (
                                  <span className="text-[10px] font-mono font-bold text-gray-500">
                                    Carrera {match.carrera}ª
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-serif font-bold text-gray-900 leading-snug">{match.trackName}</p>
                              <div className="flex items-center gap-2 text-xs font-mono text-gray-600">
                                <Calendar size={13} className="text-emerald-700" />
                                <span>{formatDateSpanish(match.date)}</span>
                              </div>
                              <button
                                onClick={async () => await openInternalBrowser(match.pdfUrl)}
                                className="w-full mt-2 py-2 bg-white hover:bg-gray-50 border border-primary/20 text-primary font-bold text-xs rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                              >
                                <ExternalLink size={13} />
                                <span>Ver Programa Oficial</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-gray-400 py-1 font-sans">
                              <Info size={15} className="shrink-0" />
                              <span>Sin compromisos registrados en los programas vigentes.</span>
                            </div>
                          )}
                        </div>

                        {/* Quick action button to view profile */}
                        <button
                          onClick={() => onSelectHorse(fav.rut || fav.name)}
                          className="text-xs font-bold font-mono text-primary hover:text-primary/80 uppercase tracking-wider text-right cursor-pointer"
                        >
                          Ver ficha completa →
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center space-y-3 bg-white rounded-3xl border-2 border-dashed border-gray-200 p-8">
                  <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
                    <Heart size={28} />
                  </div>
                  <h4 className="text-base font-serif font-bold text-gray-900">Aún no tienes regalones inscritos</h4>
                  <p className="text-xs text-gray-500 font-sans max-w-sm mx-auto leading-relaxed">
                    Escribe el nombre de tu caballo preferido en la barra superior para agregarlo a la lista de seguimiento.
                  </p>
                </div>
              )}
            </div>

            {/* User account deletion link */}
            <div className="pt-4 border-t border-gray-200 flex justify-between items-center text-xs text-gray-400 font-sans">
              <span>Datos sincronizados en tiempo real.</span>
              <button 
                onClick={handleDeleteAccount}
                className="text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
              >
                Eliminar mi cuenta y mis datos
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
