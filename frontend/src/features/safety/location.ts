import type { LocationPermissionState } from './types';

export type SafetyLocationSnapshot = {
  permission: LocationPermissionState;
  latitude?: number;
  longitude?: number;
  capturedAt?: string;
  error?: string;
};

export function requestCurrentLocation(): Promise<SafetyLocationSnapshot> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ permission: 'unavailable', error: 'Location is not available on this device or browser.' });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          permission: 'granted',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          capturedAt: new Date().toISOString(),
        });
      },
      (error) => {
        resolve({
          permission: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable',
          error: error.message || 'Location permission was not granted.',
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}
