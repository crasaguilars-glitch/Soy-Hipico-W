import { db } from '../components/providers/FirebaseProvider';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';

export interface ProgramData {
    trackId: string;
    fecha: string;
    horses: { name: string; carrera: number; recinto: string }[];
    createdAt?: any;
}

/**
 * Persiste los datos del programa procesado en Firestore.
 * Colección: 'programs'
 */
export async function saveProgramToFirestore(programData: Omit<ProgramData, 'createdAt'>) {
    try {
        console.log(`[ProgramService] Guardando programa para ${programData.trackId} en Firestore...`);
        const colRef = collection(db, 'programs');
        const docRef = await addDoc(colRef, {
            ...programData,
            createdAt: serverTimestamp()
        });
        console.log(`[ProgramService] Programa guardado con ID: ${docRef.id}`);
        return docRef.id;
    } catch (error) {
        console.error("[ProgramService] Error al guardar programa en Firestore:", error);
        throw error;
    }
}

/**
 * Busca un ejemplar en los programas almacenados secuencialmente.
 */
export async function searchHorseInPrograms(horseName: string) {
    try {
        const querySnapshot = await getDocs(collection(db, 'programs'));
        const found = [];
        for (const doc of querySnapshot.docs) {
            const data = doc.data() as ProgramData;
            const horse = data.horses?.find(h => h.name.toLowerCase() === horseName.toLowerCase());
            if (horse) {
                found.push({ ...horse, date: data.fecha, trackId: data.trackId });
            }
        }
        return found;
    } catch (error) {
        console.error("[ProgramService] Error al buscar ejemplar:", error);
        throw error;
    }
}
