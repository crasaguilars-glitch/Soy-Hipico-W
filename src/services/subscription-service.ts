import { UserProfile } from "../components/providers/FirebaseProvider";

export const TRIAL_DAYS = 7;

export interface SubscriptionStatus {
    hasAccess: boolean;
    isTrial: boolean;
    daysLeft: number;
    status: 'trial' | 'active' | 'expired';
}

/**
 * Calcula el estado de suscripción del usuario basado en su perfil de Firestore.
 */
export function getSubscriptionInfo(profile: UserProfile | null): SubscriptionStatus {
    if (!profile) {
        return { hasAccess: false, isTrial: false, daysLeft: 0, status: 'expired' };
    }

    // 1. Suscripción activa (Pagada o habilitada)
    if (profile.subscriptionStatus === 'active') {
        return { hasAccess: true, isTrial: false, daysLeft: 999, status: 'active' };
    }

    // 2. Periodo de Prueba
    const createdAt = profile.createdAt ? new Date(profile.createdAt).getTime() : Date.now();
    const now = new Date().getTime();
    const diffDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    const daysLeft = Math.max(0, TRIAL_DAYS - diffDays);

    if (diffDays < TRIAL_DAYS) {
        return {
            hasAccess: true,
            isTrial: true,
            daysLeft,
            status: 'trial'
        };
    }

    // 3. Expirado
    return {
        hasAccess: false,
        isTrial: false,
        daysLeft: 0,
        status: 'expired'
    };
}
