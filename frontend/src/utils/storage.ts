import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export const storage = {
  // Non-sensitive key-value storage (AsyncStorage)
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.error(`Error reading key ${key} from AsyncStorage:`, e);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error(`Error writing key ${key} to AsyncStorage:`, e);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing key ${key} from AsyncStorage:`, e);
    }
  },

  // Sensitive key-value storage (SecureStore on native platforms, falls back to AsyncStorage on web)
  async getSecureItem(key: string): Promise<string | null> {
    try {
      if (isWeb) {
        return await AsyncStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.error(`Error reading secure key ${key}:`, e);
      return null;
    }
  },

  async setSecureItem(key: string, value: string): Promise<void> {
    try {
      if (isWeb) {
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (e) {
      console.error(`Error writing secure key ${key}:`, e);
    }
  },

  async removeSecureItem(key: string): Promise<void> {
    try {
      if (isWeb) {
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (e) {
      console.error(`Error removing secure key ${key}:`, e);
    }
  },
};
