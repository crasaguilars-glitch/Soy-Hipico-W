import { GoogleGenerativeAI } from "@google/generative-ai";

let aiClient: GoogleGenerativeAI | null = null;

function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY no está configurada. Por favor, configúrala en el panel de Secretos.");
    }
    aiClient = new GoogleGenerativeAI(apiKey);
  }
  return aiClient;
}

/**
 * Función que realiza la búsqueda real utilizando las APIs internas del Stud Book
 */
async function ejecutarConsultaWeb(terminoBusqueda: string) {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36';
    
    try {
        console.log(`[App] Buscando ejemplar: ${terminoBusqueda}...`);
        
        // 1. Buscar el ejemplar para obtener el RUT (ID oficial)
        const searchUrl = `https://www.studbookdechile.cl/recuperar_ejemplares?filtro=${encodeURIComponent(terminoBusqueda)}`;
        const searchResp = await fetch(searchUrl, {
            headers: { 
                'User-Agent': userAgent,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (!searchResp.ok) throw new Error(`Error en búsqueda: ${searchResp.status}`);
        const resultados = await searchResp.json();

        if (!Array.isArray(resultados) || resultados.length === 0) {
            return { error: "No se encontraron resultados exactos." };
        }

        const ejemplar = resultados[0];
        const rut = ejemplar.rut;

        // 2. Obtener el resumen de campaña
        const campaignUrl = `https://www.studbookdechile.cl/api/campana/resumen-ext?rut=${rut}`;
        const campaignResp = await fetch(campaignUrl, {
            headers: { 
                'User-Agent': userAgent,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        let resumenCampana = null;
        if (campaignResp.ok) {
            const campData = await campaignResp.json();
            if (campData.figuraciones && Array.isArray(campData.figuraciones.anios)) {
                resumenCampana = campData.figuraciones.anios.map((a: any) => ({
                    año: a.anio,
                    corridas: a.cc,
                    ganadas: a.c1,
                    segundos: a.c2,
                    terceros: a.c3,
                    cuartos: a.c4,
                    premios: `$${a.sumaGanada?.formato || a.sumaGanada || 0}`
                }));
            }
        }

        // 3. Obtener datos de filiación adicionales
        const profileUrl = `https://www.studbookdechile.cl/recuperar_finasangre?rut=${rut}`;
        const profileResp = await fetch(profileUrl, {
            headers: { 
                'User-Agent': userAgent,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        let infoData = ejemplar;
        if (profileResp.ok) {
            const pData = await profileResp.json();
            if (pData.info) infoData = pData.info;
        }

        return {
            datos_principales: {
                nombre: infoData.nombre || ejemplar.nombre,
                rut: rut,
                fecha_nacimiento: infoData.fechaNacimiento || infoData.nacimiento,
                padre: infoData.padreNombre || infoData.padre,
                madre: infoData.madreNombre || infoData.madre,
                criador: infoData.criadorNombre || infoData.criador,
                propietario: infoData.propietarioNombre || infoData.actualPropietario,
                sexo: infoData.sexo,
                color: infoData.color
            },
            resumen_campaña: resumenCampana,
            url_oficial: `https://www.studbookdechile.cl/resumen_campana.php?ejemplar=${rut}`
        };

    } catch (error: any) {
        console.error("[App] Error en la conexión hípica:", error);
        return { error: `Error al conectar con el Stud Book: ${error.message}` };
    }
}

/**
 * Función principal para gestionar el flujo de conversación
 */
export async function chatAssistant(messages: any[]) {
    try {
        const ai = getAiClient();
        const model = ai.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: "Eres un asistente experto en hípica chilena. Tu principal objetivo es proveer información detallada del Stud Book de Chile. \n\nInstrucciones:\n1. Si el usuario pregunta por un caballo, usa 'consultar_studbook'.\n2. Cuando recibas los datos, presenta PRIMERO los datos de filiación (Padre, Madre, Criador, etc.) de forma clara.\n3. LUEGO, presenta el 'Resumen de Campaña' en formato de tabla o lista estructurada por años.\n4. Incluye siempre el enlace al perfil oficial que se entrega en 'url_oficial'.\n5. Si no hay resumen de campaña, menciónalo cordialmente.\n6. Responde siempre en español, con un tono entusiasta y profesional.",
            tools: [{
                functionDeclarations: [{
                    name: "consultar_studbook",
                    description: "Busca un caballo Pura Sangre en el Stud Book de Chile. Devuelve datos de filiación y el resumen completo de su campaña (carreras, premios, figuraciones por año).",
                    parameters: {
                        type: "object" as any,
                        properties: {
                            termino_busqueda: {
                                type: "STRING" as any,
                                description: "El nombre del caballo (ej: 'Il Campione')."
                            }
                        },
                        required: ["termino_busqueda"]
                    }
                }]
            }]
        });

        const history = messages.slice(0, -1).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const chat = model.startChat({ history });
        const lastMessage = messages[messages.length - 1].content;

        let result = await chat.sendMessage(lastMessage);
        let response = result.response;

        const calls = response.functionCalls();
        if (calls && calls.length > 0) {
            const call = calls[0];
            if (call.name === 'consultar_studbook') {
                const args = call.args as any;
                const data = await ejecutarConsultaWeb(args.termino_busqueda);
                
                result = await chat.sendMessage([{
                    functionResponse: {
                        name: 'consultar_studbook',
                        response: data
                    }
                }]);
                return result.response.text();
            }
        }
        
        return response.text();

    } catch (error: any) {
        console.error("Error en el ciclo de Gemini:", error);
        return "Lo siento, ocurrió un error al procesar tu solicitud hípica. Puedes realizar búsquedas directas en la pestaña Buscar.";
    }
}
