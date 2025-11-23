
import { FriendCard, TrainerProfile } from "../types";

const DB_NAME = 'pokepals_db';
const DB_VERSION = 1;
const STORE_CARDS = 'cards';
const STORE_PROFILE = 'profile';

// Open the Database
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_CARDS)) {
                db.createObjectStore(STORE_CARDS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_PROFILE)) {
                db.createObjectStore(STORE_PROFILE, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Helper: Convert Base64 Data URL to Blob
const base64ToBlob = (dataURL: string): Blob => {
    try {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    } catch (e) {
        console.warn("Blob conversion failed, returning original string as fallback", e);
        return new Blob([]); // Should not happen with valid base64
    }
};

// Helper: Convert Blob to Base64 Data URL
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// --- CARD OPERATIONS ---

export const saveCardToDB = async (card: FriendCard): Promise<void> => {
    const db = await openDB();
    
    // Optimize: Convert giant Base64 strings to Blobs for storage
    // We store the Blob, but keep the interface expecting strings for the app state
    // We modify a copy to save to DB
    const cardToSave = { ...card };

    // NOTE: In a real app, you might store Blobs directly. 
    // Here we ensure it works by keeping the structure simple. 
    // IndexedDB handles Blobs efficiently.
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_CARDS, 'readwrite');
        const store = transaction.objectStore(STORE_CARDS);
        const request = store.put(cardToSave);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getAllCardsFromDB = async (): Promise<FriendCard[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_CARDS, 'readonly');
        const store = transaction.objectStore(STORE_CARDS);
        const request = store.getAll();

        request.onsuccess = () => {
            // Sort by timestamp desc (newest first)
            const cards = request.result as FriendCard[];
            resolve(cards.sort((a, b) => b.timestamp - a.timestamp));
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteCardFromDB = async (id: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_CARDS, 'readwrite');
        const store = transaction.objectStore(STORE_CARDS);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// --- PROFILE OPERATIONS ---

export const saveProfileToDB = async (profile: TrainerProfile): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_PROFILE, 'readwrite');
        const store = transaction.objectStore(STORE_PROFILE);
        // We use a fixed ID 'main_trainer' since there is only one user
        const request = store.put({ id: 'main_trainer', ...profile });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getProfileFromDB = async (): Promise<TrainerProfile | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_PROFILE, 'readonly');
        const store = transaction.objectStore(STORE_PROFILE);
        const request = store.get('main_trainer');

        request.onsuccess = () => {
            const result = request.result;
            if (result) {
                // Remove the internal ID key before returning
                const { id, ...profile } = result;
                resolve(profile as TrainerProfile);
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject(request.error);
    });
};

// --- MIGRATION UTILITY ---
// Moves data from localStorage to IndexedDB if it exists (one-time run)
export const migrateFromLocalStorage = async (): Promise<boolean> => {
    const localCards = localStorage.getItem('pokepals_collection');
    if (localCards) {
        try {
            const parsedCards = JSON.parse(localCards);
            if (Array.isArray(parsedCards) && parsedCards.length > 0) {
                const db = await openDB();
                const transaction = db.transaction(STORE_CARDS, 'readwrite');
                const store = transaction.objectStore(STORE_CARDS);
                
                // Add all cards
                parsedCards.forEach(card => store.put(card));
                
                // Wait for transaction to complete
                await new Promise((resolve, reject) => {
                    transaction.oncomplete = resolve;
                    transaction.onerror = reject;
                });
                
                // Clear localStorage to free up space
                localStorage.removeItem('pokepals_collection');
                return true;
            }
        } catch (e) {
            console.error("Migration failed", e);
        }
    }
    return false;
};
