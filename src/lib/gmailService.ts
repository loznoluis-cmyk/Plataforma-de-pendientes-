import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Configure Google Auth Provider with Gmail Send Scope
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');

let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;

// Listen for Auth Changes
export const subscribeGoogleAuth = (
  onUserChanged: (user: User | null, token: string | null) => void
) => {
  return onAuthStateChanged(auth, (user) => {
    cachedGoogleUser = user;
    if (!user) {
      cachedAccessToken = null;
    }
    onUserChanged(user, cachedAccessToken);
  });
};

// Sign in with Google Popup and obtain Gmail OAuth Access Token
export const loginWithGoogleForGmail = async (): Promise<{ user: User; accessToken: string }> => {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken;

  if (!token) {
    throw new Error('No se pudo obtener el Token de Acceso de Google para Gmail.');
  }

  cachedAccessToken = token;
  cachedGoogleUser = result.user;
  return { user: result.user, accessToken: token };
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedGoogleUser = null;
};

export const getCachedAccessToken = () => cachedAccessToken;
export const getCachedUser = () => cachedGoogleUser;

/**
 * Creates a raw RFC822 MIME email message string and encodes it as Base64URL.
 */
function createRawEmail(toEmail: string, subject: string, htmlContent: string): string {
  const emailLines = [
    `To: ${toEmail}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    htmlContent
  ];

  const rawString = emailLines.join('\r\n');
  
  // Convert to Base64URL
  const base64 = btoa(unescape(encodeURIComponent(rawString)));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Sends a REAL email using Gmail REST API via backend proxy server.
 */
export const sendRealGmail = async ({
  toEmail,
  subject,
  htmlContent,
  accessToken
}: {
  toEmail: string;
  subject: string;
  htmlContent: string;
  accessToken?: string;
}): Promise<{ id: string; threadId: string }> => {
  const token = accessToken || cachedAccessToken;
  
  if (!token) {
    throw new Error('Debe conectar su cuenta de Google/Gmail antes de realizar el envío oficial.');
  }

  // 1. Try server endpoint proxy first
  try {
    const res = await fetch('/api/send-gmail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        toEmail,
        subject,
        htmlContent,
        accessToken: token
      })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      return { id: data.messageId, threadId: data.threadId };
    }

    if (data.error) {
      throw new Error(data.error);
    }
  } catch (backendErr: any) {
    console.warn('Backend proxy failed, trying direct Google API client fetch...', backendErr);
  }

  // 2. Direct browser fallback if backend endpoint was unreachable
  const raw = createRawEmail(toEmail, subject, htmlContent);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Gmail API Error Response:', data);
    const msg = data.error?.message || 'Error en la respuesta de la API de Gmail.';
    if (msg.includes('insufficient permissions') || msg.includes('Insufficient Permission') || msg.includes('403')) {
      throw new Error('Permisos insuficientes: Asegúrate de otorgar los permisos de envío de Gmail al iniciar sesión en Google.');
    }
    throw new Error(msg);
  }

  return { id: data.id, threadId: data.threadId };
};

/**
 * Creates a fallback Gmail Web compose URL with prefilled recipient, subject and body
 */
export const getGmailWebComposeUrl = (toEmail: string, subject: string, textBody: string) => {
  const baseUrl = 'https://mail.google.com/mail/?view=cm&fs=1';
  const encTo = encodeURIComponent(toEmail);
  const encSu = encodeURIComponent(subject);
  const encBody = encodeURIComponent(textBody);
  return `${baseUrl}&to=${encTo}&su=${encSu}&body=${encBody}`;
};

/**
 * Creates a native mailto: link for opening Outlook / Gmail app / Apple Mail directly
 */
export const getMailtoUrl = (toEmail: string, subject: string, textBody: string) => {
  const encSubject = encodeURIComponent(subject);
  const encBody = encodeURIComponent(textBody);
  return `mailto:${encodeURIComponent(toEmail)}?subject=${encSubject}&body=${encBody}`;
};



