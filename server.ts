import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import * as cheerio from "cheerio";
import * as pdfLib from "pdf-parse";
import { parsePdfWithScraper, parsePdfBuffer } from "./src/services/pdf-scraper";
import { chatAssistant } from "./src/services/ai-handler";
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

// Bundled JSON import
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e: any) {
  console.warn("[FirebaseConfig] No se pudo leer firebase-applet-config.json:", e.message);
}

// Initialize Firebase
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);

/**
 * In-memory cache for the racing calendar to avoid frequent Firestore/Web calls
 */
let cachedCalendar: { races: any[], updatedAt: string | null } = { races: [], updatedAt: null };

/**
 * Buscamos el último ID registrado en el historial de jornadas para un recinto
 */
async function getLatestIdFromHistory(recintoId: string, beforeDate: string): Promise<{ id: number, fecha: string } | null> {
  try {
    const q = query(
      collection(db, 'recintos', recintoId, 'jornadas'),
      where('fecha', '<', beforeDate),
      orderBy('fecha', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data();
      return { id: data.id, fecha: data.fecha };
    }
  } catch (e) {
    console.error(`[History] Error buscando en ${recintoId}:`, e);
  }
  return null;
}

/**
 * Gets ISO week number to handle Monday alternation
 */
function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function normalizeToYYYYMMDD(dStr: string): string {
  if (!dStr) return '';
  const clean = dStr.trim().split(' ')[0].split('T')[0];
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return clean;
}

function removeAccents(str: string): string {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function getChsUrls(dateStr: string) {
  const normalized = normalizeToYYYYMMDD(dateStr);
  const [year, month, day] = normalized.split('-');
  const formattedDate = `${day}-${month}-${year}`;
  return {
    programa: `https://static.clubhipico.cl/archivos/programa-digital/${formattedDate}.pdf`,
    volante: `https://static.clubhipico.cl/archivos/volantes/${formattedDate}.pdf`
  };
}

export function getChcSequentialUrls(dateStr: string, baseId: number = 101181, baseDateStr: string = "2026-08-04") {
  const parts = normalizeToYYYYMMDD(dateStr).split('-');
  const targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
  const isChcDay = (d: Date) => { const dow = d.getDay(); return dow === 2 || dow === 4; };
  const [bY, bM, bD] = baseDateStr.split('-').map(Number);
  const baseDate = new Date(bY, bM - 1, bD, 12, 0, 0);
  let count = 0;
  if (targetDate.getTime() > baseDate.getTime()) {
    const curr = new Date(baseDate.getTime());
    while (curr.getTime() < targetDate.getTime()) {
      curr.setDate(curr.getDate() + 1);
      if (isChcDay(curr)) count++;
    }
    const code = baseId + count;
    return {
      programa: `https://storage.elturf.com/pdf_volantes/pdf_chc/${code}.pdf`,
      volante: `https://storage.elturf.com/pdf_volantes/pdf_chc/${code}.pdf`
    };
  } else {
    const curr = new Date(targetDate.getTime());
    while (curr.getTime() < baseDate.getTime()) {
      if (isChcDay(curr)) count++;
      curr.setDate(curr.getDate() + 1);
    }
    const code = baseId - count;
    return {
      programa: `https://storage.elturf.com/pdf_volantes/pdf_chc/${code}.pdf`,
      volante: `https://storage.elturf.com/pdf_volantes/pdf_chc/${code}.pdf`
    };
  }
}

export function getHchSequentialUrls(dateStr: string, baseId: number = 101140, baseDateStr: string = "2026-08-06") {
  const parts = normalizeToYYYYMMDD(dateStr).split('-');
  const targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
  const [bY, bM, bD] = baseDateStr.split('-').map(Number);
  const baseDate = new Date(bY, bM - 1, bD, 12, 0, 0);
  const isHchDay = (d: Date) => {
    const dow = d.getDay();
    if (dow === 6) return true; // Sábados siempre
    if (dow === 4) {
      // Jueves alternados: calculamos semanas desde la fecha base
      const diffWeeks = Math.floor(Math.round((d.getTime() - baseDate.getTime()) / 86400000) / 7);
      return diffWeeks % 2 === 0;
    }
    return false;
  };
  let count = 0;
  if (targetDate.getTime() > baseDate.getTime()) {
    const curr = new Date(baseDate.getTime());
    while (curr.getTime() < targetDate.getTime()) {
      curr.setDate(curr.getDate() + 1);
      if (isHchDay(curr)) count++;
    }
    const code = baseId + count;
    return {
      programa: `https://storage.elturf.com/pdf_programa/pdf_hch/${code}.pdf`,
      volante: `https://storage.elturf.com/pdf_volantes/pdf_hch/${code}.pdf`
    };
  } else {
    const curr = new Date(targetDate.getTime());
    while (curr.getTime() < baseDate.getTime()) {
      if (isHchDay(curr)) count++;
      curr.setDate(curr.getDate() + 1);
    }
    const code = baseId - count;
    return {
      programa: `https://storage.elturf.com/pdf_programa/pdf_hch/${code}.pdf`,
      volante: `https://storage.elturf.com/pdf_volantes/pdf_hch/${code}.pdf`
    };
  }
}

/**
 * NEW: Dynamic Scraper from Teletrak.cl Homepage
 */
async function refreshTeletrakCalendarCache() {
  console.log("[Calendar] Iniciando scrapeado de www.teletrak.cl...");
  
  // Obtener correlativo dinámico desde Firestore para HCH y CHC
  let hchBaseId = 101140;
  let hchBaseDate = "2026-08-06";
  let chcBaseId = 101181;
  let chcBaseDate = "2026-08-04";

  try {
    const recintosSnap = await getDocs(collection(db, 'recintos'));
    console.log(`[Calendar] Documentos encontrados en 'recintos': ${recintosSnap.size}`);
    recintosSnap.forEach(snap => {
      const id = snap.id.toLowerCase();
      const data = snap.data();
      if (id.includes('hipodromochile')) {
        if (data.correlativo) hchBaseId = Number(data.correlativo);
        if (data.fecha_base) hchBaseDate = String(data.fecha_base).replace(/['"]+/g, '');
        console.log(`[Calendar] Configuración HCH cargada: ID ${hchBaseId} desde ${hchBaseDate}`);
      }
      if (id.includes('concepcion')) {
        if (data.correlativo) chcBaseId = Number(data.correlativo);
        if (data.fecha_base) chcBaseDate = String(data.fecha_base).replace(/['"]+/g, '');
        console.log(`[Calendar] Configuración CHC cargada: ID ${chcBaseId} desde ${chcBaseDate}`);
      }
    });
  } catch (e: any) {
    console.error("[Calendar] Error crítico cargando recintos:", e.message);
  }

  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36';
  const rawMeetings: any[] = [];
  const addedDates = new Set();

  try {
    const response = await axios.get('https://www.teletrak.cl', { headers: { 'User-Agent': userAgent }, timeout: 15000 });
    const $ = cheerio.load(response.data);

    $('.dia-carrera.tiene-carrera').each((i, el) => {
      const fechaRaw = $(el).attr('data-fecha');
      const normDate = normalizeToYYYYMMDD(fechaRaw || '');
      if (!normDate || addedDates.has(normDate)) return;

      // Tomamos la primera carrera del bloque (la principal del día para evitar duplicados)
      const item = $(el).find('.carrera-item').first();
      const trackNameRaw = item.find('.hipodromo-nombre').text().trim().toUpperCase();
      const pdfUrl = item.find('a[href*=".pdf"]').attr('href') || item.find('.btn-descargar-programa').attr('href');
      const trackNameNorm = removeAccents(trackNameRaw);

      if (trackNameRaw && !trackNameNorm.includes('SIMULCASTING')) {
        let trackId = 0;

        // PRIORIDAD 1: Identificación por Dominio del Link (La verdad absoluta)
        if (pdfUrl) {
          const lowPdf = pdfUrl.toLowerCase();
          if (lowPdf.includes('sporting.cl')) trackId = 2;
          else if (lowPdf.includes('pdf_hch') || lowPdf.includes('hipodromo.cl')) trackId = 4;
          else if (lowPdf.includes('clubhipico.cl') || lowPdf.includes('chs_')) trackId = 3;
          else if (lowPdf.includes('pdf_chc') || lowPdf.includes('concepcion')) trackId = 1;
        }

        // PRIORIDAD 2: Calendario Natural (Dueños del día)
        if (trackId === 0) {
          const d = new Date(normDate + "T12:00:00");
          const dow = d.getDay();
          if (dow === 3) trackId = 2;      // Miércoles -> Sporting
          else if (dow === 2) trackId = 1; // Martes -> Concepción
          else if (dow === 6) trackId = 4; // Sábado -> Hipódromo Chile
          else if (dow === 5) trackId = 3; // Viernes -> Club Hípico Stgo
        }

        // PRIORIDAD 3: Texto de Teletrak (Fallback final)
        if (trackId === 0) {
          if (trackNameNorm.includes('SANTIAGO')) trackId = 3;
          else if (trackNameNorm.includes('CHILE')) trackId = 4;
          else if (trackNameNorm.includes('VALPARAISO') || trackNameNorm.includes('SPORTING')) trackId = 2;
          else if (trackNameNorm.includes('CONCEPCION')) trackId = 1;
        }

        if (trackId > 0) {
          // Si el ID detectado no coincide con el nombre de Teletrak, corregimos el nombre para la App
          let correctedName = trackNameRaw;
          if (trackId === 1) correctedName = "Club Hípico de Concepción";
          else if (trackId === 2) correctedName = "Valparaíso Sporting";
          else if (trackId === 3) correctedName = "Club Hípico de Santiago";
          else if (trackId === 4) correctedName = "Hipódromo Chile";

          addedDates.add(normDate);
          rawMeetings.push({
            trackId,
            trackName: correctedName,
            fecha: normDate,
            hasTeletrakPdf: !!pdfUrl,
            originalPdfUrl: pdfUrl
          });
        }
      }
    });
  } catch (e: any) {
    console.error("[Calendar] Error scrapeando portada:", e.message);
  }

  // Ordenar por fecha
  const sortedMeetings = rawMeetings.sort((a, b) => a.fecha.localeCompare(b.fecha));

  const racesList = [];
  const processedDates = new Set();

  // 1. Primero agregamos lo que Teletrak SI tiene (máximo 4)
  for (const m of sortedMeetings) {
    if (racesList.length >= 4) break;
    racesList.push(m);
    processedDates.add(m.fecha);
  }

  // 2. Si no llegamos a 4, completamos según calendario semanal de carreras
  let searchDate = new Date();
  searchDate.setHours(12, 0, 0, 0);
  if (racesList.length > 0) {
    const lastDateParts = racesList[racesList.length - 1].fecha.split('-');
    searchDate = new Date(Number(lastDateParts[0]), Number(lastDateParts[1]) - 1, Number(lastDateParts[2]), 12, 0, 0);
  } else {
    searchDate.setDate(searchDate.getDate() - 1);
  }

  while (racesList.length < 4) {
    searchDate.setDate(searchDate.getDate() + 1);
    const dateStr = searchDate.toISOString().split('T')[0];
    if (processedDates.has(dateStr)) continue;

    const dow = searchDate.getDay();
    let foundTrack = null;

    if (dow === 1) foundTrack = { id: 3, name: "Club Hípico de Santiago" }; // Lunes
    else if (dow === 2) foundTrack = { id: 1, name: "Club Hípico de Concepción" }; // Martes
    else if (dow === 3) foundTrack = { id: 2, name: "Valparaíso Sporting" }; // Miércoles
    else if (dow === 5) foundTrack = { id: 3, name: "Club Hípico de Santiago" }; // Viernes
    else if (dow === 6) foundTrack = { id: 4, name: "Hipódromo Chile" }; // Sábados
    else if (dow === 4) {
      const isHch = (d: Date) => {
        const [bY, bM, bD] = hchBaseDate.split('-').map(Number);
        const baseDate = new Date(bY, bM - 1, bD, 12, 0, 0);
        const diffWeeks = Math.floor(Math.round((d.getTime() - baseDate.getTime()) / 86400000) / 7);
        return diffWeeks % 2 === 0;
      };
      if (isHch(searchDate)) foundTrack = { id: 4, name: "Hipódromo Chile" };
      else foundTrack = { id: 1, name: "Club Hípico de Concepción" };
    }

    if (foundTrack) {
      racesList.push({
        trackId: foundTrack.id,
        trackName: foundTrack.name,
        fecha: dateStr,
        hasTeletrakPdf: false,
        originalPdfUrl: null
      });
      processedDates.add(dateStr);
    }

    if (processedDates.size > 20) break;
  }

  const finalRaces = [];
  const hchRecintoId = "Hipodromochile";
  const chcRecintoId = "Clubhipicoconcepcion";

  for (const m of racesList) {
    let pPdf = null;
    let vPdf = null;

    if (m.trackId === 4) { // HCH
      let id: number | undefined;
      const histDoc = await getDoc(doc(db, 'recintos', hchRecintoId, 'jornadas', m.fecha)).catch(() => null);
      if (histDoc && histDoc.exists()) {
        id = histDoc.data().id;
      } else {
        const idMatch = m.originalPdfUrl?.match(/\/(\d+)\.pdf/) || m.originalPdfUrl?.match(/id=(\d+)/);
        const extractedId = idMatch ? Number(idMatch[1]) : null;
        if (extractedId && extractedId > hchBaseId) {
          id = extractedId;
        } else {
          const latest = await getLatestIdFromHistory(hchRecintoId, m.fecha);
          if (latest) {
            id = latest.id + 1;
          } else {
            const calc = getHchSequentialUrls(m.fecha, hchBaseId, hchBaseDate);
            const match = calc.programa.match(/\/(\d+)\.pdf/);
            if (match) id = Number(match[1]);
          }
        }

        if (id) {
          await setDoc(doc(db, 'recintos', hchRecintoId, 'jornadas', m.fecha), {
            id: id,
            fecha: m.fecha,
            updatedAt: new Date().toISOString()
          }).catch(e => console.error("[History] Error al auto-registrar jornada:", e));
        }
      }
      pPdf = `https://storage.elturf.com/pdf_programa/pdf_hch/${id}.pdf`;
      vPdf = `https://storage.elturf.com/pdf_volantes/pdf_hch/${id}.pdf`;
    }
    else if (m.trackId === 1) { // CHC
      let id: number | undefined;
      const histDoc = await getDoc(doc(db, 'recintos', chcRecintoId, 'jornadas', m.fecha)).catch(() => null);
      if (histDoc && histDoc.exists()) {
        id = histDoc.data().id;
      } else {
        const idMatch = m.originalPdfUrl?.match(/\/(\d+)\.pdf/) || m.originalPdfUrl?.match(/id=(\d+)/);
        const extractedId = idMatch ? Number(idMatch[1]) : null;
        if (extractedId && extractedId > chcBaseId) {
          id = extractedId;
        } else {
          const latest = await getLatestIdFromHistory(chcRecintoId, m.fecha);
          id = latest ? latest.id + 1 : (Number(getChcSequentialUrls(m.fecha, chcBaseId, chcBaseDate).programa.match(/\/(\d+)\.pdf/)?.[1]) || chcBaseId);
        }
        if (id) {
          await setDoc(doc(db, 'recintos', chcRecintoId, 'jornadas', m.fecha), {
            id: id,
            fecha: m.fecha,
            updatedAt: new Date().toISOString()
          }).catch(() => {});
        }
      }
      pPdf = m.originalPdfUrl || `https://clubhipicoconcepcion.cl/carreras-proximos-programas`;
      vPdf = `https://storage.elturf.com/pdf_volantes/pdf_chc/${id}.pdf`;
    }
    else if (m.trackId === 3) { // CHS
      const c = getChsUrls(m.fecha);
      pPdf = c.programa;
      vPdf = c.volante;
    }
    else if (m.trackId === 2) { // VSC
      const [y, mm, d] = m.fecha.split('-');
      const date = new Date(Number(y), Number(mm) - 1, Number(d), 12, 0, 0);
      const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const monthName = months[date.getMonth()];
      const shortMonth = monthName.slice(0, 4);
      pPdf = m.originalPdfUrl || `https://www.sporting.cl/hipica/upload/handout/${m.fecha}/VOLANTE_${date.getDate()}_${shortMonth}_COLOR.pdf`;
      vPdf = m.originalPdfUrl || `https://www.sporting.cl/hipica/upload/handout/${m.fecha}/VOLANTE_${date.getDate()}_${shortMonth}_COLOR.pdf`;
    }

    finalRaces.push({
      trackId: m.trackId,
      trackName: m.trackName,
      fecha: m.fecha,
      hora: "14:30",
      descripcion: `Reunión oficial ${m.trackName}`,
      programa_pdf: pPdf,
      volante_pdf: vPdf
    });
  }

  const final = finalRaces.sort((a, b) => a.fecha.localeCompare(b.fecha));

  const sanitized = final.map(r => ({
    trackId: r.trackId || 0,
    trackName: r.trackName || "Desconocido",
    fecha: r.fecha || "",
    hora: r.hora || "14:30",
    descripcion: r.descripcion || "",
    programa_pdf: r.programa_pdf || null,
    volante_pdf: r.volante_pdf || null
  }));

  if (sanitized.length > 0) {
    try {
      const updatedAt = new Date().toISOString();
      await setDoc(doc(db, 'system', 'teletrak_calendar'), {
        races: sanitized,
        updatedAt: updatedAt
      });
      cachedCalendar = { races: sanitized, updatedAt };
      console.log(`[Calendar] Cache persistida y actualizada en memoria: ${sanitized.length} jornadas.`);
    } catch (err: any) {
      console.error("[Calendar] Error crítico guardando en Firestore:", err.message);
    }
  }
  return sanitized;
}

async function startServer() {
  const app = express();
  app.use(cors({ origin: (o, c) => c(null, true), credentials: true }));
  app.use(express.json({ limit: '50mb' }));

  // Initialize Cache on boot from Firestore
  try {
    const snap = await getDoc(doc(db, 'system', 'teletrak_calendar')).catch(() => null);
    if (snap && snap.exists()) {
      cachedCalendar = {
        races: snap.data().races || [],
        updatedAt: snap.data().updatedAt || null
      };
      console.log(`[ServerBoot] Caché de calendario cargada desde Firestore. Última actualización: ${cachedCalendar.updatedAt}`);
    } else {
      console.log(`[ServerBoot] No hay caché en Firestore. Iniciando primer scrape en background.`);
      refreshTeletrakCalendarCache().catch(() => {});
    }
  } catch (e) {
    console.error("[ServerBoot] Error inicializando caché:", e);
  }

  // API Health
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Programa de Hoy
  app.get("/api/programs/today", async (req, res) => {
    const today = normalizeToYYYYMMDD((req.query.today as string) || new Date().toISOString().split('T')[0]);
    try {
      const races = cachedCalendar.races;
      const updatedAt = cachedCalendar.updatedAt;
      const todayRaceInCache = races.find((r: any) => r.fecha === today);

      const lastUpdateDay = updatedAt ? normalizeToYYYYMMDD(updatedAt) : "";
      if (lastUpdateDay !== today) {
        console.log(`[HomeOptimize] Caché requiere actualización (Última: ${updatedAt}). Refrescando background.`);
        refreshTeletrakCalendarCache().catch(e => console.error("[BackgroundRefresh] Error:", e.message));
      }

      if (todayRaceInCache) {
        let domain = "";
        if (todayRaceInCache.trackId === 1) domain = "www.clubhipicoconcepcion.cl";
        else if (todayRaceInCache.trackId === 2) domain = "www.sporting.cl";
        else if (todayRaceInCache.trackId === 3) {
          domain = "www.clubhipico.cl";
          todayRaceInCache.programa_pdf = getChsUrls(todayRaceInCache.fecha).programa;
        }
        else if (todayRaceInCache.trackId === 4) domain = "https://hipodromo.cl";
        return res.json({
          trackId: todayRaceInCache.trackId,
          trackName: todayRaceInCache.trackName,
          domain,
          todayRace: todayRaceInCache
        });
      }
      return res.json(null);
    } catch (e: any) {
      console.error("[HomeOptimize] Error fatal:", e.message);
      res.status(500).json({ error: "Today Program API error" });
    }
  });

  // API Programas Oficiales
  app.get("/api/programs", async (req, res) => {
    const today = normalizeToYYYYMMDD((req.query.today as string) || new Date().toISOString().split('T')[0]);
    try {
      let races = cachedCalendar.races;
      const updatedAt = cachedCalendar.updatedAt;

      if (races.length === 0) {
        races = await refreshTeletrakCalendarCache();
      } else {
        const diff = updatedAt ? (new Date().getTime() - new Date(updatedAt).getTime()) / 3600000 : 99;
        if (diff > 2 || req.query.refresh === 'true') {
          console.log("[Calendar] Refrescando caché (Background)...");
          refreshTeletrakCalendarCache().catch(() => {});
        }
      }

      const tracks = [
        { id: 1, name: "Club Hípico de Concepción", dom: "www.clubhipicodeconcepcion.cl" },
        { id: 2, name: "Valparaíso Sporting", dom: "www.sporting.cl" },
        { id: 3, name: "Club Hípico de Santiago", dom: "www.clubhipico.cl" },
        { id: 4, name: "Hipódromo Chile", dom: "https://hipodromo.cl" }
      ];
      const mNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      const dNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      
      const fDate = (ds: string) => {
        if (!ds) return "-";
        const [y, m, d] = ds.split('-').map(Number);
        const rd = new Date(y, m - 1, d, 12, 0, 0);
        return `${dNames[rd.getDay()]} ${rd.getDate()} de ${mNames[rd.getMonth()]}`;
      };

      const tracksResults = tracks.map(track => {
        const trackRaces = races.filter((r: any) => r.trackId === track.id);
        const todayRace = trackRaces.find((r: any) => r.fecha === today);
        const allFuture = trackRaces
          .filter((r: any) => r.fecha > today)
          .sort((a: any, b: any) => a.fecha.localeCompare(b.fecha));

        const upcomingRaces = allFuture.slice(0, 5).map((r: any) => {
          let updatedRace = { ...r };
          if (track.id === 3) {
            updatedRace.programa_pdf = getChsUrls(r.fecha).programa;
          }
          return {
            ...updatedRace,
            formattedDate: fDate(r.fecha),
            daysAway: Math.round((new Date(r.fecha).getTime() - new Date(today).getTime()) / 86400000)
          };
        });

        let finalTodayRace = todayRace ? { ...todayRace, formattedDate: fDate(todayRace.fecha) } : null;
        if (finalTodayRace && track.id === 3) {
          finalTodayRace.programa_pdf = getChsUrls(finalTodayRace.fecha).programa;
        }

        return {
          trackId: track.id,
          trackName: track.name,
          domain: track.dom,
          todayRace: finalTodayRace,
          upcomingRace: upcomingRaces[0] || null,
          upcomingRaces: upcomingRaces
        };
      });

      res.json({ tracks: tracksResults });
    } catch (e: any) {
      res.status(500).json({ error: "Programs API error" });
    }
  });

  // API Parse PDF
  app.get("/api/parse-pdf", async (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ error: "Missing url parameter" });
    try {
      const logs: string[] = [];
      const logger = (m: string) => logs.push(m);
      const data = await parsePdfWithScraper(url, logger);
      res.json({ structuredData: data, logs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // AI Assistant Chat
  app.post("/api/ai/chat", async (req, res) => {
    try {
      res.json({ content: await chatAssistant(req.body.messages) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Stud Book de Chile - Búsqueda de ejemplares
  app.get("/api/search", async (req, res) => {
    try {
      const resp = await axios.get(`https://www.studbookdechile.cl/recuperar_ejemplares?filtro=${encodeURIComponent(String(req.query.q))}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'X-Requested-With': 'XMLHttpRequest' },
        timeout: 5000
      });
      const results = (resp.data || []).map((item: any) => ({
        id: item.rut,
        name: item.nombre.toUpperCase(),
        subtitle: `RUT: ${item.rut}`
      }));
      res.json({ results: results.slice(0, 15) });
    } catch (e) {
      res.json({ results: [] });
    }
  });

  // Stud Book de Chile - Perfil de ejemplar
  app.get("/api/horse/profile/:id", async (req, res) => {
    let { id } = req.params;
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36';
    const headers = { 'User-Agent': userAgent, 'X-Requested-With': 'XMLHttpRequest' };
    try {
      if (isNaN(Number(id))) {
        const s = await axios.get(`https://www.studbookdechile.cl/recuperar_ejemplares?filtro=${encodeURIComponent(id)}`, { headers });
        if (s.data && s.data[0]) id = s.data[0].rut;
      }
      const [infoRes, propRes, pedRes] = await Promise.all([
        axios.get(`https://www.studbookdechile.cl/recuperar_finasangre?rut=${id}`, { headers }),
        axios.get(`https://www.studbookdechile.cl/api/stud/resumen-por-ejemplar?rut=${id}`, { headers }),
        axios.get(`https://www.studbookdechile.cl/api/pedigree/arbol?rut=${id}`, { headers })
      ]);

      let infoData = infoRes.data;
      if (infoData.info) infoData = infoData.info;
      if (!infoData.ejemplar && infoData.nombre) {
        infoData.ejemplar = { ...infoData };
      }
      res.json({
        info: infoData,
        property: propRes.data,
        pedigree: pedRes.data
      });
    } catch (e: any) {
      console.error(`[HorseProfile] Error: ${e.message}`);
      res.status(500).json({ error: "Error al consolidar perfil" });
    }
  });

  // Registro Oficial - Campaña de ejemplar
  app.get("/api/horse/campaign/:id", async (req, res) => {
    let { id } = req.params;
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36';
    const headers = { 'User-Agent': userAgent, 'X-Requested-With': 'XMLHttpRequest' };
    try {
      if (isNaN(Number(id))) {
        const s = await axios.get(`https://www.studbookdechile.cl/recuperar_ejemplares?filtro=${encodeURIComponent(id)}`, { headers });
        if (s.data && s.data[0]) id = s.data[0].rut;
      }

      // Consultas paralelas resilientes
      const results = await Promise.allSettled([
        axios.get(`https://www.studbookdechile.cl/api/campana/resumen?rut=${id}`, { headers }),
        axios.get(`https://www.studbookdechile.cl/api/campana/resumen-ext?rut=${id}`, { headers })
      ]);

      const nac = results[0].status === 'fulfilled' ? results[0].value.data : {};
      const int = results[1].status === 'fulfilled' ? results[1].value.data : {};

      // Unificar resumen anual
      const aniosMap = new Map();
      const processAnio = (a: any) => {
        if (!a || !a.anio) return;
        const key = String(a.anio);
        if (!aniosMap.has(key)) aniosMap.set(key, { year: key, cc: 0, c1: 0, c2: 0, c3: 0, prize: '0' });
        const o = aniosMap.get(key);
        o.cc += (a.cc || 0);
        o.c1 += (a.c1 || 0);
        o.c2 += (a.c2 || 0);
        o.c3 += (a.c3 || 0);
        if (a.sumaGanada?.formato) o.prize = a.sumaGanada.formato;
      };

      (nac.figuraciones?.anios || nac.anios || []).forEach(processAnio);
      (int.figuraciones?.anios || int.anios || []).forEach(processAnio);

      const summary = Array.from(aniosMap.values())
        .sort((a, b) => b.year.localeCompare(a.year))
        .map(s => ({
          year: s.year,
          races: String(s.cc),
          pos1: String(s.c1),
          pos2: String(s.c2),
          pos3: String(s.c3),
          prizes: `$${s.prize}`
        }));

      // Extraer actuaciones de forma ultra-robusta
      const actsNac = nac.figuraciones?.detalle || nac.campana?.actuaciones || nac.actuaciones || nac.detalle || [];
      const actsInt = int.figuraciones?.detalle || int.campana?.actuaciones || int.actuaciones || int.detalle || [];

      const parseDate = (d: string) => {
        if (!d) return 0;
        const p = d.split('/');
        if (p.length < 3) return 0;
        return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0])).getTime();
      };

      let rawActs = [...actsNac, ...actsInt];
      if (rawActs.length === 0) {
        // Fallback a endpoint de actuaciones si no venían en resumen
        try {
          const perfRes = await axios.get(`https://www.studbookdechile.cl/api/campana/actuaciones?rut=${id}`, { headers, timeout: 5000 });
          if (Array.isArray(perfRes.data)) rawActs = perfRes.data;
        } catch {
          // Ignorar fallback
        }
      }

      const performances = rawActs
        .filter(p => p && (p.fecha || p.hipodromo))
        .sort((a, b) => parseDate(b.fecha) - parseDate(a.fecha))
        .slice(0, 20)
        .map(p => ({
          hipodromo: p.hipodromo || p.recinto || 'N/A',
          fecha: p.fecha || '',
          tipoCarrera: p.tipoCarrera || p.condicion || '',
          premio: p.premio || p.nombrePremio || '',
          distancia: String(p.distancia || ''),
          distanciaUnidad: 'm',
          jinete: p.jinete || p.jinetePeso || '',
          lugar: String(p.lugar || ''),
          sumaGanada: p.sumaGanada || { formato: '0' }
        }));

      res.json({ summary, performances });
    } catch (e: any) {
      console.error(`[HorseCampaign] Error fatal: ${e.message}`);
      res.status(500).json({ error: "Error al consolidar campaña" });
    }
  });

  // Regalones: Búsqueda de apariciones en próximas jornadas
  app.get("/api/favorites/upcoming", async (req, res) => {
    const names = String(req.query.names || "").split(",").filter(Boolean);
    const today = normalizeToYYYYMMDD(String(req.query.today || new Date().toISOString().split("T")[0]));
    const results: any[] = [];
    const logs: string[] = [];
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36';

    const addLog = (msg: string) => {
      console.log(msg);
      logs.push(msg);
    };

    const cleanNames = names.map(n => n.trim().toUpperCase());
    addLog(`[Regalones] Iniciando búsqueda de ${cleanNames.length} ejemplares: ${cleanNames.join(', ')}`);

    try {
      const snap = await getDoc(doc(db, "system", "teletrak_calendar")).catch(() => null);
      let races = (snap && snap.exists()) ? snap.data().races || [] : [];
      const lastUpdate = (snap && snap.exists()) ? snap.data().updatedAt : null;
      const diffHours = lastUpdate ? (new Date().getTime() - new Date(lastUpdate).getTime()) / 3600000 : 99;

      if (races.length === 0 || diffHours > 1) {
        addLog(`[Regalones] Calendario antiguo (${Math.round(diffHours)}h). Refrescando datos de Teletrak...`);
        races = await refreshTeletrakCalendarCache();
      } else {
        addLog(`[Regalones] Usando calendario actualizado hace ${Math.round(diffHours * 60)} min.`);
      }

      const upcomingRaces = races
        .filter((r: any) => {
          return r.fecha >= today || (r.fecha.replace(/-/g,'') >= today.replace(/-/g,''));
        })
        .sort((a: any, b: any) => a.fecha.localeCompare(b.fecha))
        .slice(0, 10);

      addLog(`[Regalones] Escaneando jornadas: ${upcomingRaces.map(r => `${r.trackName.split(' ')[0]} (${r.fecha})`).join(', ')}`);

      for (const r of upcomingRaces) {
        const pdfUrl = r.volante_pdf || r.programa_pdf;
        if (!pdfUrl) continue;
        try {
          addLog(`[Regalones]   Analizando: ${r.trackName} (${r.fecha})`);
          const indexId = `${r.trackId}_${r.fecha.replace(/-/g, '')}`;
          const indexRef = doc(db, "programs_indexed", indexId);
          const indexSnap = await getDoc(indexRef);
          let indexedData: any = null;

          if (indexSnap.exists()) {
            addLog(`[Regalones]   Index encontrado en DB (Búsqueda instantánea).`);
            indexedData = indexSnap.data();
          } else {
            addLog(`[Regalones]   Index NO encontrado. Descargando programa...`);
            const pdfResp = await axios.get(pdfUrl, {
              responseType: "arraybuffer",
              timeout: 30000,
              headers: {
                'User-Agent': userAgent,
                'Referer': 'https://www.teletrak.cl/',
                'Accept': 'application/pdf'
              }
            });
            let rawText = "";
            try {
              const Parsadora = (pdfLib as any).PDFParse || (pdfLib as any).default?.PDFParse || pdfLib;
              if (typeof Parsadora === 'function' && Parsadora.prototype) {
                const parser = new (Parsadora as any)(new Uint8Array(pdfResp.data));
                const result = await parser.getText();
                rawText = result.text || "";
              } else {
                const functionParser = (pdfLib as any).default || pdfLib;
                const result = await functionParser(Buffer.from(pdfResp.data));
                rawText = result.text || "";
              }
            } catch (e) {
              addLog(`[Regalones]   ! Falló extracción de texto simple.`);
            }

            const cleanText = removeAccents(rawText.toUpperCase()).replace(/\s+/g, ' ');
            if (cleanText.length > 300) {
              indexedData = {
                trackId: r.trackId,
                trackName: r.trackName,
                date: r.fecha,
                rawText: cleanText,
                pdfUrl: pdfUrl,
                method: 'text',
                updatedAt: new Date().toISOString()
              };
            } else {
              const base64Data = Buffer.from(pdfResp.data).toString('base64');
              const aiData = await parsePdfBuffer(base64Data);
              indexedData = {
                trackId: r.trackId,
                trackName: r.trackName,
                date: r.fecha,
                races: aiData,
                pdfUrl: pdfUrl,
                method: 'ai',
                updatedAt: new Date().toISOString()
              };
            }
            await setDoc(indexRef, indexedData);
            addLog(`[Regalones]   ✓ Jornada indexada en Firestore.`);
          }

          if (indexedData.method === 'text' && indexedData.rawText) {
            const text = indexedData.rawText;
            for (const name of names) {
              const horseName = removeAccents(name.trim().toUpperCase());
              if (text.includes(horseName)) {
                addLog(`[Regalones]     ✓ ENCONTRADO: ${horseName}`);
                results.push({
                  horseName: name.trim().toUpperCase(),
                  trackName: r.trackName,
                  trackId: r.trackId,
                  date: r.fecha,
                  carrera: 0,
                  pdfUrl: pdfUrl
                });
              }
            }
          } else if (indexedData.races) {
            for (const race of indexedData.races) {
              const caballos = race.competidores || race.caballos || [];
              for (const h of caballos) {
                const horseScraped = removeAccents((typeof h === 'string' ? h : h.nombre).toUpperCase());
                for (const name of names) {
                  const horseTarget = removeAccents(name.trim().toUpperCase());
                  if (horseScraped === horseTarget || horseScraped.includes(horseTarget)) {
                    addLog(`[Regalones]     ✓ ENCONTRADO (IA): ${horseTarget}`);
                    results.push({
                      horseName: name.trim().toUpperCase(),
                      trackName: r.trackName,
                      trackId: r.trackId,
                      date: r.fecha,
                      carrera: race.numero || race.carrera_numero || 0,
                      pdfUrl: pdfUrl
                    });
                  }
                }
              }
            }
          }
        } catch (err: any) {
          addLog(`[Regalones]   ! Falló descarga/lectura en ${r.trackName}: ${err.message}`);
        }
      }

      const uniqueResults = results.filter((v, i, a) =>
        a.findIndex(t => (t.horseName === v.horseName && t.date === v.date)) === i
      );
      addLog(`[Regalones] Búsqueda finalizada. Total matches: ${uniqueResults.length}`);
      res.json({ results: uniqueResults, logs });
    } catch (e: any) {
      addLog(`[Regalones] ERROR CRÍTICO: ${e.message}`);
      res.status(500).json({ error: e.message, logs });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(process.cwd(), 'dist');
    app.use(express.static(dist));
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(e => {
  console.error("!!! ERROR FATAL AL INICIAR SERVIDOR:", e.message);
  process.exit(1);
});
