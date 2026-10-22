import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signOut as fbSignOut,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with configured databaseId
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// In-memory OAuth Access Token cache (Never stored in localStorage)
let inMemoryAccessToken: string | null = null;

export function getCachedAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setCachedAccessToken(token: string | null) {
  inMemoryAccessToken = token;
}

// Google Auth Provider configured with Workspace Scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://mail.google.com/');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.modify');

// Sign in with Google
export async function signInWithGoogleWorkspace() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setCachedAccessToken(credential.accessToken);
    }

    // Save/update user profile in Firestore
    if (result.user) {
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(userRef, {
        userId: result.user.uid,
        email: result.user.email || '',
        displayName: result.user.displayName || 'Omni User',
        photoUrl: result.user.photoURL || '',
        createdAt: new Date().toISOString(),
      }, { merge: true });
    }

    return { user: result.user, accessToken: credential?.accessToken || null };
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    throw error;
  }
}

// Sign out
export async function signOut() {
  setCachedAccessToken(null);
  await fbSignOut(auth);
}

// Connection check on boot
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn('Firebase Firestore is operating in offline cache mode.');
    }
  }
}

// Error handling required by Firebase integration standards
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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// -------------------------------------------------------------
// Firebase Chat Cloud Sync Helpers
// -------------------------------------------------------------

export interface FirebaseChatThread {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface FirebaseChatMessage {
  id: string;
  userId: string;
  threadId: string;
  sender: 'user' | 'omni' | 'council';
  text: string;
  timestamp: string;
  mode?: string;
  councilData?: any;
  createdAt: string;
}

export async function saveFirebaseChatThread(userId: string, thread: { id: string; title: string; createdAt?: string; updatedAt?: string }) {
  const path = `users/${userId}/chatThreads/${thread.id}`;
  try {
    const threadRef = doc(db, 'users', userId, 'chatThreads', thread.id);
    await setDoc(threadRef, {
      id: thread.id,
      userId,
      title: thread.title || 'New conversation',
      createdAt: thread.createdAt || new Date().toISOString(),
      updatedAt: thread.updatedAt || new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveFirebaseChatMessage(userId: string, threadId: string, message: {
  id: string;
  sender: 'user' | 'omni' | 'council';
  text: string;
  timestamp: string;
  mode?: string;
  councilData?: any;
}) {
  const path = `users/${userId}/chatThreads/${threadId}/messages/${message.id}`;
  try {
    const msgRef = doc(db, 'users', userId, 'chatThreads', threadId, 'messages', message.id);
    await setDoc(msgRef, {
      id: message.id,
      userId,
      threadId,
      sender: message.sender,
      text: message.text,
      timestamp: message.timestamp,
      mode: message.mode || 'normal',
      councilData: message.councilData || null,
      createdAt: new Date().toISOString(),
    }, { merge: true });

    // Touch thread updated_at
    const threadRef = doc(db, 'users', userId, 'chatThreads', threadId);
    await setDoc(threadRef, {
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadFirebaseChatThreads(userId: string): Promise<FirebaseChatThread[]> {
  const path = `users/${userId}/chatThreads`;
  try {
    const collRef = collection(db, 'users', userId, 'chatThreads');
    const snapshot = await getDocs(collRef);
    const threads: FirebaseChatThread[] = [];
    snapshot.forEach((d) => {
      threads.push(d.data() as FirebaseChatThread);
    });
    return threads.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function loadFirebaseChatMessages(userId: string, threadId: string): Promise<FirebaseChatMessage[]> {
  const path = `users/${userId}/chatThreads/${threadId}/messages`;
  try {
    const collRef = collection(db, 'users', userId, 'chatThreads', threadId, 'messages');
    const snapshot = await getDocs(collRef);
    const messages: FirebaseChatMessage[] = [];
    snapshot.forEach((d) => {
      messages.push(d.data() as FirebaseChatMessage);
    });
    return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Clear token on auth change
onAuthStateChanged(auth, (user) => {
  if (!user) {
    setCachedAccessToken(null);
  }
});

