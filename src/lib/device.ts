const DEVICE_KEY = 'moodmap:device:v1';
let memoryToken: string | undefined;

/** Zufallstoken ohne Fingerprinting; Privatmodus darf die Demo nicht verhindern. */
export function getDeviceToken(): string {
  try {
    const stored = localStorage.getItem(DEVICE_KEY);
    if (stored) return (memoryToken = stored);
    const token = memoryToken ?? crypto.randomUUID();
    memoryToken = token;
    localStorage.setItem(DEVICE_KEY, token);
    return token;
  } catch {
    return (memoryToken ??= crypto.randomUUID());
  }
}

/** Wellengebundener Hash; das Roh-Token gehört nicht in Teilnahme-/Antwortdatensätze. */
export async function hashDeviceToken(token: string, scope: string): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify([token, scope]));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
