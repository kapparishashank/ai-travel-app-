import { storage } from '../../utils/storage';
import type { SafetyInfo } from './types';

const safetyInfoKey = (destination: string) => `travelai:safety-info:${destination.toLowerCase().trim()}`;
const consentKey = 'travelai:safety-location-consent';

export async function cacheSafetyInfo(destination: string, info: SafetyInfo) {
  await storage.setItem(safetyInfoKey(destination), JSON.stringify({ ...info, dataLabel: '[CACHED]' }));
}

export async function getCachedSafetyInfo(destination: string): Promise<SafetyInfo | null> {
  const raw = await storage.getItem(safetyInfoKey(destination));
  return raw ? JSON.parse(raw) : null;
}

export async function saveLocationConsent(consented: boolean) {
  await storage.setItem(consentKey, consented ? 'yes' : 'no');
}

export async function getLocationConsent() {
  return (await storage.getItem(consentKey)) === 'yes';
}
