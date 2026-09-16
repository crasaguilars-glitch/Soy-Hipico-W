import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * URL oficial de la transmisión en directo Teletrak TV
 */
export const TELETRAK_LIVE_STREAM_URL = "https://teletraktv.janus.cl/player2/player_teletrak.html?autoplay=yes&muted=yes";

/**
 * Abre una URL de forma segura en una nueva pestaña del navegador.
 * Usa un elemento <a> temporal para evitar bloqueos de ventanas emergentes (popups) en iframes.
 */
export async function openInternalBrowser(url: string) {
  if (!url) return;
  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export function normalizeToYYYYMMDD(dStr: string): string {
  if (!dStr) return '';
  const clean = dStr.trim().split(' ')[0].split('T')[0];
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts[0].length === 4) { // YYYY/MM/DD
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else if (parts[2].length === 4) { // DD/MM/YYYY
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts[0].length === 4) { // YYYY-MM-DD
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else if (parts[2].length === 4) { // DD-MM-YYYY
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return clean;
}

export function parseLocalDate(dateStr: string): Date {
  const normalized = normalizeToYYYYMMDD(dateStr);
  const parts = normalized.split('-');
  if (parts.length !== 3) return new Date();
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
}

export function removeAccents(str: string): string {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function isHchRaceDay(date: Date): boolean {
  const dayOfWeek = date.getDay(); // 4: Jueves, 6: Sábado
  return dayOfWeek === 4 || dayOfWeek === 6;
}

export function isChcRaceDay(date: Date): boolean {
  const dayOfWeek = date.getDay(); // 2: Martes, 4: Jueves
  return dayOfWeek === 2 || dayOfWeek === 4;
}

/**
 * URLs oficiales para Club Hípico de Santiago (CHS - Track 3)
 */
export function getChsUrls(dateStr: string) {
  const normalized = normalizeToYYYYMMDD(dateStr);
  const [year, month, day] = normalized.split('-');
  const formattedDate = `${day}-${month}-${year}`;
  return {
    programa: `https://static.clubhipico.cl/archivos/programa-digital/${formattedDate}.pdf`,
    volante: `https://static.clubhipico.cl/archivos/volantes/${formattedDate}.pdf`
  };
}

/**
 * URLs secuenciales dinámicas para Club Hípico de Concepción (CHC - Track 1)
 */
export function getChcSequentialUrls(
  dateStr: string,
  baseId: number = 101181,
  baseDateStr: string = "2026-08-04"
) {
  const normalized = normalizeToYYYYMMDD(dateStr);
  const parts = normalized.split('-');
  const targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
  const isChcDay = (d: Date) => {
    const dow = d.getDay();
    return dow === 2 || dow === 4; // Martes y Jueves
  };

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
      code,
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
      code,
      programa: `https://storage.elturf.com/pdf_volantes/pdf_chc/${code}.pdf`,
      volante: `https://storage.elturf.com/pdf_volantes/pdf_chc/${code}.pdf`
    };
  }
}

/**
 * URLs secuenciales dinámicas para Hipódromo Chile (HCH - Track 4)
 */
export function getHchSequentialUrls(
  dateStr: string,
  baseId: number = 101140,
  baseDateStr: string = "2026-08-06"
) {
  const normalized = normalizeToYYYYMMDD(dateStr);
  const parts = normalized.split('-');
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
      code,
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
      code,
      programa: `https://storage.elturf.com/pdf_programa/pdf_hch/${code}.pdf`,
      volante: `https://storage.elturf.com/pdf_volantes/pdf_hch/${code}.pdf`
    };
  }
}

/**
 * URLs para Valparaíso Sporting Club (VSC - Track 2)
 */
export function getSportingUrls(dateStr: string) {
  const normalized = normalizeToYYYYMMDD(dateStr);
  const [y, mm, d] = normalized.split('-');
  const date = new Date(Number(y), Number(mm) - 1, Number(d), 12, 0, 0);
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const monthName = months[date.getMonth()];
  const shortMonth = monthName.slice(0, 4);
  const dayNum = date.getDate();
  
  return {
    programa: `https://www.sporting.cl/hipica/upload/handout/${normalized}/VOLANTE_${dayNum}_${shortMonth}_COLOR.pdf`,
    volante: `https://www.sporting.cl/hipica/upload/handout/${normalized}/VOLANTE_${dayNum}_${shortMonth}_COLOR.pdf`
  };
}

// Helpers de compatibilidad con código existente
export function getChcProgramCodeAndUrl(dateStr: string): { code: number; url: string } {
  const res = getChcSequentialUrls(dateStr);
  return { code: res.code, url: res.programa };
}

export function getHchProgramCodeAndUrl(dateStr: string): { code: number; url: string } {
  const res = getHchSequentialUrls(dateStr);
  return { code: res.code, url: res.programa };
}

export function getHchVolanteUrl(dateStr: string): string {
  return getHchSequentialUrls(dateStr).volante;
}

/**
 * Obtiene la URL oficial de Programa para cada hipódromo
 */
export function getOfficialProgramUrl(trackId: number, dateStr?: string): string {
  if (!dateStr) {
    switch (trackId) {
      case 1: return "https://clubhipicoconcepcion.cl/carreras-proximos-programas";
      case 2: return "https://www.sporting.cl/";
      case 3: return "https://www.clubhipico.cl/carreras/programas/";
      case 4: return "https://www.hipodromochile.cl/revista-revista/";
      default: return "https://www.teletrak.cl";
    }
  }

  const normalized = normalizeToYYYYMMDD(dateStr);
  switch (trackId) {
    case 1: // Club Hípico de Concepción
      return getChcSequentialUrls(normalized).programa;
    case 2: // Valparaíso Sporting
      return getSportingUrls(normalized).programa;
    case 3: // Club Hípico de Santiago
      return getChsUrls(normalized).programa;
    case 4: // Hipódromo Chile
      return getHchSequentialUrls(normalized).programa;
    default:
      return "https://www.teletrak.cl";
  }
}

/**
 * Obtiene la URL oficial de Volante para cada hipódromo
 */
export function getOfficialVolanteUrl(trackId: number, dateStr?: string): string {
  if (!dateStr) return getOfficialProgramUrl(trackId);
  const normalized = normalizeToYYYYMMDD(dateStr);
  switch (trackId) {
    case 1: // Club Hípico de Concepción
      return getChcSequentialUrls(normalized).volante;
    case 2: // Valparaíso Sporting
      return getSportingUrls(normalized).volante;
    case 3: // Club Hípico de Santiago
      return getChsUrls(normalized).volante;
    case 4: // Hipódromo Chile
      return getHchSequentialUrls(normalized).volante;
    default:
      return "https://www.teletrak.cl";
  }
}

/**
 * URLs para ver los resultados de las carreras de cada hipódromo
 */
export function getResultsUrl(trackId: number, dateStr?: string): string {
  const normalized = dateStr ? normalizeToYYYYMMDD(dateStr) : new Date().toISOString().split('T')[0];

  switch (trackId) {
    case 1: // Club Hípico de Concepción
      return "https://clubhipicoconcepcion.cl/carreras-ultimos-resultados";
    case 2: // Valparaíso Sporting
      return `https://www.sporting.cl/hipica/front/es/reunion/${normalized}.html`;
    case 3: // Club Hípico de Santiago
      return `https://www.clubhipico.cl/carreras/resultados/?fecha=${normalized}`;
    case 4: // Hipódromo Chile
      return "https://hipodromo.cl/carreras-ultimos-resultados";
    default:
      return "https://www.teletrak.cl";
  }
}
