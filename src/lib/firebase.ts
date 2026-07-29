import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDocFromServer,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { PendienteItem, UserAccount } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore
export const db = getFirestore(app);

// Error Handler helper according to Firebase skill standards
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Sync Error: ', JSON.stringify(errInfo));
}

// Test cloud connection
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, '_connection_check', 'ping'));
    return true;
  } catch (error) {
    // Expected error if document doesn't exist, but server responded
    if (error instanceof Error && error.message.includes('offline')) {
      return false;
    }
    return true;
  }
}

// Collections
const PENDIENTES_COLLECTION = 'pendientes';
const USUARIOS_COLLECTION = 'usuarios';

// REAL-TIME SUBSCRIBERS WITH CLOUD READS

export async function fetchAllPendientesCloud(): Promise<PendienteItem[]> {
  try {
    const colRef = collection(db, PENDIENTES_COLLECTION);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) return [];
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PendienteItem));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, PENDIENTES_COLLECTION);
    throw error;
  }
}

export function subscribePendientesCloud(
  onData: (items: PendienteItem[]) => void,
  onError: (error: any) => void,
  defaultItemsIfEmpty: PendienteItem[]
) {
  const colRef = collection(db, PENDIENTES_COLLECTION);
  
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        // If snapshot is empty, load local storage or fallback without overwriting cloud
        let localOrInitial = defaultItemsIfEmpty;
        try {
          const localData = localStorage.getItem('uptc_pendientes_v1_data');
          if (localData) {
            const parsed = JSON.parse(localData);
            if (Array.isArray(parsed) && parsed.length > 0) {
              localOrInitial = parsed;
            }
          }
        } catch (e) {}
        onData(localOrInitial);
      } else {
        const items: PendienteItem[] = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as PendienteItem)
        );
        onData(items);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, PENDIENTES_COLLECTION);
      onError(error);
    }
  );
}

export function subscribeUsersCloud(
  onData: (users: UserAccount[]) => void,
  onError: (error: any) => void,
  defaultUsersIfEmpty: UserAccount[]
) {
  const colRef = collection(db, USUARIOS_COLLECTION);

  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onData(defaultUsersIfEmpty);
      } else {
        const users: UserAccount[] = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as UserAccount)
        );
        onData(users);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, USUARIOS_COLLECTION);
      onError(error);
    }
  );
}

// Helper function to sanitize objects for Firestore (removes undefined values that cause write errors)
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

// CLOUD WRITE OPERATIONS

export async function savePendienteCloud(item: PendienteItem): Promise<void> {
  try {
    const docRef = doc(db, PENDIENTES_COLLECTION, item.id);
    const cleanItem = sanitizeForFirestore(item);
    await setDoc(docRef, cleanItem, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${PENDIENTES_COLLECTION}/${item.id}`);
    throw error;
  }
}

export async function deletePendienteCloud(id: string): Promise<void> {
  try {
    const docRef = doc(db, PENDIENTES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PENDIENTES_COLLECTION}/${id}`);
    throw error;
  }
}

export async function saveAllPendientesCloud(
  items: PendienteItem[],
  isReplacement: boolean = true,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  try {
    const newIdsSet = new Set(items.map((i) => i.id));

    if (isReplacement) {
      // Get current docs in Firestore and delete any that are no longer in new dataset
      const colRef = collection(db, PENDIENTES_COLLECTION);
      const existingSnapshot = await getDocs(colRef);
      
      const docsToDelete = existingSnapshot.docs.filter((docSnap) => !newIdsSet.has(docSnap.id));
      if (docsToDelete.length > 0) {
        const deleteChunkSize = 450;
        for (let i = 0; i < docsToDelete.length; i += deleteChunkSize) {
          const batch = writeBatch(db);
          const chunk = docsToDelete.slice(i, i + deleteChunkSize);
          for (const docSnap of chunk) {
            batch.delete(docSnap.ref);
          }
          await batch.commit();
        }
      }
    }

    // Write / Merge new items in chunks of 450 (Firestore max batch limit is 500)
    const chunkSize = 450;
    const total = items.length;
    for (let i = 0; i < total; i += chunkSize) {
      const batch = writeBatch(db);
      const chunk = items.slice(i, i + chunkSize);
      for (const item of chunk) {
        const cleanItem = sanitizeForFirestore(item);
        const docRef = doc(db, PENDIENTES_COLLECTION, item.id);
        batch.set(docRef, cleanItem, { merge: true });
      }
      await batch.commit();
      if (onProgress) {
        onProgress(Math.min(i + chunkSize, total), total);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, PENDIENTES_COLLECTION);
    throw error;
  }
}

export async function saveUserCloud(user: UserAccount): Promise<void> {
  try {
    const docRef = doc(db, USUARIOS_COLLECTION, user.id);
    const cleanUser = sanitizeForFirestore(user);
    await setDoc(docRef, cleanUser, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${USUARIOS_COLLECTION}/${user.id}`);
    throw error;
  }
}

export async function saveAllUsersCloud(users: UserAccount[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const user of users) {
      const cleanUser = sanitizeForFirestore(user);
      const docRef = doc(db, USUARIOS_COLLECTION, user.id);
      batch.set(docRef, cleanUser, { merge: true });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, USUARIOS_COLLECTION);
    throw error;
  }
}
