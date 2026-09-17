import axios from 'axios';
import { saveProgramToFirestore, ProgramData } from './program-service';
import { getChcProgramCodeAndUrl } from '../lib/utils';
import { API_BASE_URL } from '../api-config';

interface TrackParser {
  getProgramUrl(date: Date): string;
  parse(url: string, onProgress?: (p: number, logs?: string[]) => void): Promise<any>;
}

const CHCParser: TrackParser = {
  getProgramUrl: (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return getChcProgramCodeAndUrl(dateStr).url;
  },
  parse: async (url: string, onProgress?: (p: number) => void) => {
    onProgress?.(100);
    console.log(`Parsing CHC PDF: ${url}`);
    return { horses: [] };
  }
};

const VSCParser: TrackParser = {
  getProgramUrl: (date: Date) => {







    // Nota: El link antiguo `sporting.cl/hipica/upload/handout/...` ya no es válido.
    // Sporting publica actualmente sus programas en Issuu bajo el nombre "Revista Tierra Derecha".
    // Se requiere una lógica que consulte a su API o busque el enlace dinámico.
    console.warn("VSC URL generator necesita ser actualizada para consultar fuentes externas.");
    return ""; 
  },
  parse: async (url: string, onProgress?: (p: number) => void) => {
    onProgress?.(20);

































    // Debido a la falta de un PDF estático predecible, esta función requiere 
    // una lógica de scraping adaptada a la nueva estructura de Sporting.
    console.error("VSC Parser: URL no válida o falta lógica de scraping para la fuente real.");
    
    onProgress?.(100);
    return {
      trackId: 'VSC',
      fecha: new Date().toISOString().split('T')[0],
      horses: []
    };
  }
};

const HCHParser: TrackParser = {
  getProgramUrl: (date: Date) => {
    const sequence = 100673; 
    return `https://storage.elturf.com/pdf_volantes/pdf_hch/${sequence}.pdf`;
  },
  parse: async (url: string, onProgress: (p: number, logs?: string[]) => void) => {
    onProgress(10);
    const response = await axios.get(`${API_BASE_URL}/api/parse-pdf?url=${encodeURIComponent(url)}`);
    const structuredData = response.data.structuredData;
    const serverLogs = response.data.logs;
    
    onProgress(60, serverLogs);
    
    const horses = (structuredData || []).flatMap((c: any) => (c.competidores || []).map((comp: any) => ({
      name: comp.nombre,
      carrera: c.carrera || 1,
      recinto: "Hipódromo Chile"
    })));

    const programData: ProgramData = {
      trackId: 'HCH',
      fecha: new Date().toISOString().split('T')[0],
      horses
    };

    onProgress(80, ["Guardando en Firestore..."]); 
    await saveProgramToFirestore(programData);
    
    onProgress(100);
    return programData;
  }
};

export const TrackParsers: Record<string, TrackParser> = {
  CHC: CHCParser,
  VSC: VSCParser,
  HCH: HCHParser
};
