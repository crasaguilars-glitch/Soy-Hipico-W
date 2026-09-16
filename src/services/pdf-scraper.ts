import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios';

let aiClient: GoogleGenerativeAI | null = null;

function getAiClient() {
    if (!aiClient) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY no está configurada.");
        }
        aiClient = new GoogleGenerativeAI(apiKey);
    }
    return aiClient;
}

export async function parsePdfBuffer(base64Data: string): Promise<any> {
    const client = getAiClient();
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent([
        {
            text: "Analiza el programa de carreras hípicas. Extrae la información de TODAS las carreras. Para cada carrera, identifica el número de carrera, la distancia y la lista completa de nombres de los caballos (ejemplares) participantes en MAYÚSCULAS y sin acentos. Devuelve un JSON estructurado con el formato: [{\"carrera\": 1, \"distancia\": \"1000m\", \"competidores\": [{\"nombre\": \"CABALLO UNO\"}]}]",
        },
        {
            inlineData: {
                data: base64Data,
                mimeType: "application/pdf"
            }
        }
    ]);

    const response = await result.response;
    const text = response.text();

    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson || '[]');
}

export async function parsePdfWithScraper(url: string, logger: (msg: string) => void): Promise<any> {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
    const pdfBuffer = Buffer.from(response.data);
    
    logger(`[Scraper] PDF descargado. Analizando con Gemini Vision...`);
    
    const client = getAiClient();
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent([
        {
            text: "Analiza este programa de carreras. Extrae la información de todas las carreras presentes. Devuelve un objeto JSON estructurado con la propiedad 'carreras' que contiene un arreglo de carreras con su número y competidores con nombres en mayúsculas.",
        },
        {
            inlineData: {
                data: pdfBuffer.toString("base64"),
                mimeType: "application/pdf"
            }
        }
    ]);

    const aiResponse = await result.response;
    const text = aiResponse.text();
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const structuredData = JSON.parse(cleanJson || '{"carreras": []}');
    logger(`[Scraper] ${structuredData.carreras?.length || 0} carreras extraídas con éxito.`);
    
    return structuredData;
}
