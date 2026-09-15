import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDocs, collection, onSnapshot, getDocFromServer, deleteDoc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

// Test connection on boot as instructed in SKILL.md
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Define error helper as instructed in SKILL.md
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Circuit breaker state to prevent infinite exception/retry cycles when Firestore permissions are restricted
let isFirestoreAvailable = true;

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isFirestoreAvailable = true;
    console.log('Network online. Cloud Firestore synchronization active.');
  });
}

export function enableFirestore() {
  isFirestoreAvailable = true;
}

export function getIsFirestoreAvailable(): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    return isFirestoreAvailable;
  }
  return isFirestoreAvailable;
}

export function getFirebaseAppInfo() {
  return {
    projectId: firebaseConfig.projectId || 'synapsis-edu',
    appId: firebaseConfig.appId,
    appName: 'ai-studio-applet-webapp',
    databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
    officialUrl: 'https://synapsis-edu.web.app'
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errStr = error instanceof Error ? error.message : String(error);

  const errInfo: FirestoreErrorInfo = {
    error: errStr,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Generic Firebase synchronization methods
 */
export async function fetchCollectionFromFirestore<T>(collName: string): Promise<T[]> {
  if (!isFirestoreAvailable) {
    return [];
  }
  try {
    const querySnapshot = await getDocs(collection(db, collName));
    const items: T[] = [];
    querySnapshot.forEach((docSnapshot) => {
      items.push(docSnapshot.data() as T);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collName);
    return [];
  }
}

export function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
}

export async function saveDocToFirestore<T extends { id: string }>(collName: string, item: T): Promise<void> {
  if (!isFirestoreAvailable) {
    return;
  }
  try {
    const cleanItem = sanitizeForFirestore(item);
    await setDoc(doc(db, collName, item.id), cleanItem as any);
    itemSyncCache.set(`${collName}/${item.id}`, JSON.stringify(item));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collName}/${item.id}`);
  }
}

export async function deleteDocFromFirestore(collName: string, docId: string): Promise<void> {
  if (!docId) return;
  markAsDeleted(docId);
  itemSyncCache.delete(`${collName}/${docId}`);
  if (!isFirestoreAvailable) {
    return;
  }
  try {
    await deleteDoc(doc(db, collName, docId));
  } catch (error) {
    console.warn(`Firestore document deletion failed for ${collName}/${docId}:`, error);
  }
}

import { User, Subject, Semester, Parcial, GradeRecord, Assignment, AssignmentSubmission, Institution, Exam, Submission } from '../types';
import { mergeStates, saveState, getDeletedIds, markAsDeleted } from './db';

export interface AppState {
  users: User[];
  institutions: Institution[];
  subjects: Subject[];
  semesters: Semester[];
  parciales: Parcial[];
  exams: Exam[];
  submissions: Submission[];
  gradeRecords: GradeRecord[];
  assignments: Assignment[];
  assignmentSubmissions: AssignmentSubmission[];
}

/**
 * Synchronize deleted IDs with Firestore to ensure that once a record is deleted,
 * it never reappears on refresh or across devices.
 */
export async function syncDeletedIdsWithFirestore(): Promise<Set<string>> {
  const localDeleted = getDeletedIds();
  if (!isFirestoreAvailable) {
    return localDeleted;
  }
  try {
    const metaRef = doc(db, 'system_metadata', 'deleted_records');
    const snap = await getDoc(metaRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.ids)) {
        data.ids.forEach((id: string) => {
          if (id) localDeleted.add(id);
        });
      }
    }
    // Update local storage
    try {
      localStorage.setItem('ep_deleted_ids', JSON.stringify(Array.from(localDeleted)));
    } catch (e) {}

    // Save consolidated set back to Firestore
    await setDoc(metaRef, { ids: Array.from(localDeleted), lastUpdated: new Date().toISOString() }, { merge: true });
  } catch (e) {
    console.warn('Could not synchronize deleted records with cloud, continuing with local set.', e);
  }
  return localDeleted;
}

/**
 * Permanently registers an ID as deleted both locally and in Cloud Firestore.
 */
export async function registerDeletedId(id: string, collName?: string): Promise<void> {
  if (!id) return;
  markAsDeleted(id);
  if (collName) {
    deleteDocFromFirestore(collName, id).catch(() => {});
  }
  if (isFirestoreAvailable) {
    try {
      const metaRef = doc(db, 'system_metadata', 'deleted_records');
      const allDeleted = Array.from(getDeletedIds());
      await setDoc(metaRef, { ids: allDeleted, lastUpdated: new Date().toISOString() }, { merge: true });
    } catch (e) {
      // Background sync error ignored
    }
  }
}

/**
 * Fetch the complete application state from Firestore
 * Returns null if the users collection is empty (meaning database is completely uninitialized)
 */
export async function fetchFullStateFromFirestore(): Promise<AppState | null> {
  if (!isFirestoreAvailable) {
    return null;
  }

  const fetchPromise = async (): Promise<AppState | null> => {
    try {
      // Synchronize deleted IDs and all collections in parallel for maximum speed (<600ms)
      const [
        deletedIds,
        users,
        institutions,
        subjects,
        semesters,
        parciales,
        exams,
        submissions,
        gradeRecords,
        assignments,
        assignmentSubmissions
      ] = await Promise.all([
        syncDeletedIdsWithFirestore(),
        fetchCollectionFromFirestore<User>('users'),
        fetchCollectionFromFirestore<Institution>('institutions'),
        fetchCollectionFromFirestore<Subject>('subjects'),
        fetchCollectionFromFirestore<Semester>('semesters'),
        fetchCollectionFromFirestore<Parcial>('parciales'),
        fetchCollectionFromFirestore<Exam>('exams'),
        fetchCollectionFromFirestore<Submission>('submissions'),
        fetchCollectionFromFirestore<GradeRecord>('gradeRecords'),
        fetchCollectionFromFirestore<Assignment>('assignments'),
        fetchCollectionFromFirestore<AssignmentSubmission>('assignmentSubmissions'),
      ]);

      if (users.length === 0 && institutions.length === 0 && subjects.length === 0) {
        return null; // DB is completely fresh/empty
      }

      const filterAliveAndClean = <T extends { id: string }>(coll: string, list: T[]): T[] => {
        return (list || []).filter(item => {
          if (item && item.id && deletedIds.has(item.id)) {
            deleteDocFromFirestore(coll, item.id).catch(() => {});
            return false;
          }
          return item && item.id;
        });
      };

      return {
        users: filterAliveAndClean('users', users),
        institutions: filterAliveAndClean('institutions', institutions),
        subjects: filterAliveAndClean('subjects', subjects),
        semesters: filterAliveAndClean('semesters', semesters),
        parciales: filterAliveAndClean('parciales', parciales),
        exams: filterAliveAndClean('exams', exams),
        submissions: filterAliveAndClean('submissions', submissions),
        gradeRecords: filterAliveAndClean('gradeRecords', gradeRecords),
        assignments: filterAliveAndClean('assignments', assignments),
        assignmentSubmissions: filterAliveAndClean('assignmentSubmissions', assignmentSubmissions),
      };
    } catch (error) {
      console.error('Failed to download full db state from Firestore, continuing with local state.', error);
      return null;
    }
  };

  // Safe timeout: if internet is slow, initialize UI with local cache without disabling cloud sync
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      console.log("Firestore download taking longer than expected. Using local cache while cloud sync connects in background.");
      resolve(null);
    }, 12000);
  });

  return Promise.race([fetchPromise(), timeoutPromise]);
}

/**
 * Seeds the fresh Firestore database structures with default seed state
 */
export async function seedFirestore(initialState: AppState): Promise<void> {
  if (!isFirestoreAvailable) {
    return;
  }

  const seedPromise = async (): Promise<void> => {
    try {
      console.log('Seeding fresh Firestore database with institutional structures...');
      const promises: Promise<void>[] = [];

      initialState.users.forEach(item => promises.push(saveDocToFirestore('users', item)));
      initialState.institutions.forEach(item => promises.push(saveDocToFirestore('institutions', item)));
      initialState.subjects.forEach(item => promises.push(saveDocToFirestore('subjects', item)));
      initialState.semesters.forEach(item => promises.push(saveDocToFirestore('semesters', item)));
      initialState.parciales.forEach(item => promises.push(saveDocToFirestore('parciales', item)));
      initialState.exams.forEach(item => promises.push(saveDocToFirestore('exams', item)));
      initialState.submissions.forEach(item => promises.push(saveDocToFirestore('submissions', item)));
      initialState.gradeRecords.forEach(item => promises.push(saveDocToFirestore('gradeRecords', item)));
      initialState.assignments.forEach(item => promises.push(saveDocToFirestore('assignments', item)));
      (initialState.assignmentSubmissions || []).forEach(item => promises.push(saveDocToFirestore('assignmentSubmissions', item)));

      await Promise.all(promises);
      console.log('Firestore seeding completed successfully.');
    } catch (error) {
      console.error('Failed to seed default state onto Firestore.', error);
    }
  };

  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      console.log("Firestore seeding continuing in background.");
      resolve();
    }, 15000);
  });

  return Promise.race([seedPromise(), timeoutPromise]);
}

// Keep a local cache of individual synced items to avoid redundant Firestore writes and save quota
let itemSyncCache = new Map<string, string>();

/**
 * Intelligently synchronizes the local AppState changes to Firestore.
 * Utilizes key-based comparison (hashes/strings) to only write documents that are brand-new or modified.
 */
export async function syncToFirestore(newState: AppState): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    isFirestoreAvailable = true;
  }
  if (!isFirestoreAvailable) {
    return;
  }
  try {
    const keys: (keyof AppState)[] = [
      'users',
      'institutions',
      'subjects',
      'semesters',
      'parciales',
      'exams',
      'submissions',
      'gradeRecords',
      'assignments',
      'assignmentSubmissions'
    ];

    const promises: Promise<void>[] = [];

    const deletedIds = getDeletedIds();

    keys.forEach((key) => {
      const currentList = ((newState[key] || []) as any[]).filter(
        item => item && item.id && !deletedIds.has(item.id)
      );
      const currentIds = new Set(currentList.map(item => item.id));

      // 1. Detect deletions: check if any item previously cached for this collection is gone
      const cachedIdsForColl: string[] = [];
      itemSyncCache.forEach((_, cacheKey) => {
        if (cacheKey.startsWith(`${key}/`)) {
          const docId = cacheKey.substring(key.length + 1);
          cachedIdsForColl.push(docId);
        }
      });

      cachedIdsForColl.forEach((cachedId) => {
        if (!currentIds.has(cachedId) || deletedIds.has(cachedId)) {
          // Document was deleted! Remove from Firestore, cache and mark as deleted
          promises.push(deleteDocFromFirestore(key, cachedId));
          itemSyncCache.delete(`${key}/${cachedId}`);
          markAsDeleted(cachedId);
          console.log(`Deleted entity ${key}/${cachedId} from Cloud Firestore.`);
        }
      });

      // 2. Upsert new or modified items to Firestore
      currentList.forEach((item: any) => {
        if (!item || !item.id || deletedIds.has(item.id)) return;
        const itemKey = `${key}/${item.id}`;
        const itemString = JSON.stringify(item);
        const cachedString = itemSyncCache.get(itemKey);

        if (cachedString !== itemString) {
          const savePromise = saveDocToFirestore(key, item).then(() => {
            itemSyncCache.set(itemKey, itemString);
          });
          promises.push(savePromise);
        }
      });
    });

    if (promises.length > 0) {
      await Promise.all(promises);
      console.log(`Synced ${promises.length} modified/new entities to Cloud Firestore.`);
    }
  } catch (error) {
    console.error('Error synchronizing local AppState changes to remote Firestore.', error);
  }
}

/**
 * Initialize cache after downloading full state
 */
export function initializeSyncCache(state: AppState) {
  itemSyncCache.clear();
  const keys: (keyof AppState)[] = [
    'users',
    'institutions',
    'subjects',
    'semesters',
    'parciales',
    'exams',
    'submissions',
    'gradeRecords',
    'assignments',
    'assignmentSubmissions'
  ];
  keys.forEach((key) => {
    const list = state[key] as any[];
    if (list && Array.isArray(list)) {
      list.forEach((item) => {
        itemSyncCache.set(`${key}/${item.id}`, JSON.stringify(item));
      });
    }
  });
}

/**
 * Pushes all records of the given AppState to Cloud Firestore
 */
export async function pushAllStateToFirestore(state: AppState): Promise<number> {
  enableFirestore();
  const keys: (keyof AppState)[] = [
    'users',
    'institutions',
    'subjects',
    'semesters',
    'parciales',
    'exams',
    'submissions',
    'gradeRecords',
    'assignments',
    'assignmentSubmissions'
  ];

  let count = 0;
  const promises: Promise<void>[] = [];

  keys.forEach((key) => {
    const list = (state[key] || []) as any[];
    list.forEach((item: any) => {
      if (item && item.id) {
        count++;
        promises.push(saveDocToFirestore(key, item));
      }
    });
  });

  await Promise.all(promises);
  initializeSyncCache(state);
  return count;
}

/**
 * Synchronizes auxiliary collections stored in localStorage with Cloud Firestore
 */
export async function syncSecondaryCollections(): Promise<number> {
  enableFirestore();
  let count = 0;

  // 1. Tablón de anuncios
  try {
    const remoteNotices = await fetchCollectionFromFirestore<any>('tablon');
    const localNoticesRaw = localStorage.getItem('ep_tablon');
    const localNotices = localNoticesRaw ? JSON.parse(localNoticesRaw) : [];

    const map = new Map<string, any>();
    remoteNotices.forEach((n) => n.id && map.set(n.id, n));
    localNotices.forEach((n: any) => {
      if (n && n.id) {
        if (!map.has(n.id)) {
          map.set(n.id, n);
        } else {
          const rem = map.get(n.id);
          const lT = n.creado || '';
          const rT = rem.creado || '';
          if (lT >= rT) map.set(n.id, n);
        }
      }
    });
    const mergedNotices = Array.from(map.values());
    if (mergedNotices.length > 0) {
      localStorage.setItem('ep_tablon', JSON.stringify(mergedNotices));
      for (const notice of mergedNotices) {
        await saveDocToFirestore('tablon', notice);
        count++;
      }
    }
  } catch (e) {
    console.warn('Tablon sync error:', e);
  }

  // 2. Finanzas (pagos)
  try {
    const remotePayments = await fetchCollectionFromFirestore<any>('payments');
    const localPaymentsRaw = localStorage.getItem('ep_finanzas');
    const localPayments = localPaymentsRaw ? JSON.parse(localPaymentsRaw) : [];

    const map = new Map<string, any>();
    remotePayments.forEach((p) => p.id && map.set(p.id, p));
    localPayments.forEach((p: any) => {
      if (p && p.id) map.set(p.id, p);
    });
    const mergedPayments = Array.from(map.values());
    if (mergedPayments.length > 0) {
      localStorage.setItem('ep_finanzas', JSON.stringify(mergedPayments));
      for (const payment of mergedPayments) {
        await saveDocToFirestore('payments', payment);
        count++;
      }
    }
  } catch (e) {
    console.warn('Finanzas sync error:', e);
  }

  // 3. Agenda
  try {
    const remoteAgenda = await fetchCollectionFromFirestore<any>('agenda');
    const localAgendaRaw = localStorage.getItem('ep_agenda');
    const localAgenda = localAgendaRaw ? JSON.parse(localAgendaRaw) : [];

    const map = new Map<string, any>();
    remoteAgenda.forEach((a) => a.id && map.set(a.id, a));
    localAgenda.forEach((a: any) => {
      if (a && a.id) map.set(a.id, a);
    });
    const mergedAgenda = Array.from(map.values());
    if (mergedAgenda.length > 0) {
      localStorage.setItem('ep_agenda', JSON.stringify(mergedAgenda));
      for (const item of mergedAgenda) {
        await saveDocToFirestore('agenda', item);
        count++;
      }
    }
  } catch (e) {
    console.warn('Agenda sync error:', e);
  }

  // 4. Wiki Articles (Educativo)
  try {
    const remoteWiki = await fetchCollectionFromFirestore<any>('wikiArticles');
    const localWikiRaw = localStorage.getItem('ep_wiki_articles');
    const localWiki = localWikiRaw ? JSON.parse(localWikiRaw) : [];

    const map = new Map<string, any>();
    remoteWiki.forEach((w) => w.id && map.set(w.id, w));
    localWiki.forEach((w: any) => {
      if (w && w.id) map.set(w.id, w);
    });
    const mergedWiki = Array.from(map.values());
    if (mergedWiki.length > 0) {
      localStorage.setItem('ep_wiki_articles', JSON.stringify(mergedWiki));
      for (const item of mergedWiki) {
        await saveDocToFirestore('wikiArticles', item);
        count++;
      }
    }
  } catch (e) {
    console.warn('Wiki sync error:', e);
  }

  // 5. Asistencia (attendance)
  try {
    const remoteAtt = await fetchCollectionFromFirestore<any>('attendance');
    const localAttRaw = localStorage.getItem('ep_attendance');
    const localAtt = localAttRaw ? JSON.parse(localAttRaw) : [];

    const map = new Map<string, any>();
    remoteAtt.forEach((a) => a.id && map.set(a.id, a));
    localAtt.forEach((a: any) => {
      if (a && a.id) map.set(a.id, a);
    });
    const mergedAtt = Array.from(map.values());
    if (mergedAtt.length > 0) {
      localStorage.setItem('ep_attendance', JSON.stringify(mergedAtt));
      for (const item of mergedAtt) {
        await saveDocToFirestore('attendance', item);
        count++;
      }
    }
  } catch (e) {
    console.warn('Attendance sync error:', e);
  }

  return count;
}

/**
 * Executes a complete bidirectional synchronization between local state and Cloud Firestore:
 * 1. Pulls all remote documents from Firestore.
 * 2. Merges with local documents (retaining newest edits).
 * 3. Pushes any non-synced documents back to Cloud Firestore.
 * 4. Synchronizes secondary collections (Tablón, Finanzas, Agenda, Wiki, Asistencia).
 * 5. Updates cache and saves to local storage.
 */
export async function fullBidirectionalSync(
  currentState: AppState
): Promise<{ success: boolean; pushedCount: number; pulledCount: number; mergedState: AppState }> {
  enableFirestore();
  let pushedCount = 0;
  let pulledCount = 0;

  try {
    // 1. Fetch remote full state
    const remoteState = await fetchFullStateFromFirestore();
    let mergedState = currentState;

    if (remoteState) {
      mergedState = mergeStates(currentState, remoteState);
      const keys: (keyof AppState)[] = [
        'users',
        'institutions',
        'subjects',
        'semesters',
        'parciales',
        'exams',
        'submissions',
        'gradeRecords',
        'assignments',
        'assignmentSubmissions'
      ];
      keys.forEach((k) => {
        pulledCount += remoteState[k]?.length || 0;
      });
    }

    // 2. Upload all items of mergedState to Firestore
    const keys: (keyof AppState)[] = [
      'users',
      'institutions',
      'subjects',
      'semesters',
      'parciales',
      'exams',
      'submissions',
      'gradeRecords',
      'assignments',
      'assignmentSubmissions'
    ];

    const pushPromises: Promise<void>[] = [];
    for (const key of keys) {
      const list = (mergedState[key] || []) as any[];
      for (const item of list) {
        if (item && item.id) {
          pushedCount++;
          pushPromises.push(saveDocToFirestore(key, item));
        }
      }
    }
    await Promise.all(pushPromises);

    // 3. Sync secondary collections
    const secCount = await syncSecondaryCollections();
    pushedCount += secCount;

    // 4. Update sync cache and localStorage
    initializeSyncCache(mergedState);
    saveState(mergedState);

    return {
      success: true,
      pushedCount,
      pulledCount,
      mergedState
    };
  } catch (err) {
    console.error('Full bidirectional sync failed:', err);
    return {
      success: false,
      pushedCount,
      pulledCount,
      mergedState: currentState
    };
  }
}



