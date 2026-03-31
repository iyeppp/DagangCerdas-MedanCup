// DagangCerdas — API Key Store
// Menyimpan API key Google Gemini secara aman menggunakan expo-secure-store

import * as SecureStore from 'expo-secure-store';
import { GEMINI_API_KEY } from '../../utils/constants';

const API_KEY_STORAGE = 'dagangcerdas_gemini_key';

let cachedKey: string | null = null;

/**
 * Get the stored Gemini API key
 */
export async function getApiKey(): Promise<string | null> {
  // 1. Cek dari kodingan langsung (jika user mengisi hardcode)
  if (GEMINI_API_KEY && GEMINI_API_KEY.startsWith('AIzaSy')) {
    return GEMINI_API_KEY;
  }

  // 2. Cek cache memori
  if (cachedKey) return cachedKey;

  try {
    const key = await SecureStore.getItemAsync(API_KEY_STORAGE);
    cachedKey = key;
    return key;
  } catch (error) {
    console.error('[APIKey] Get error:', error);
    return null;
  }
}

/**
 * Save/update the Gemini API key
 */
export async function setApiKey(key: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(API_KEY_STORAGE, key);
    cachedKey = key;
    console.log('[APIKey] API key saved successfully');
  } catch (error) {
    console.error('[APIKey] Save error:', error);
    throw error;
  }
}

/**
 * Remove the stored API key
 */
export async function removeApiKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(API_KEY_STORAGE);
    cachedKey = null;
    console.log('[APIKey] API key removed');
  } catch (error) {
    console.error('[APIKey] Remove error:', error);
  }
}

/**
 * Check if an API key is stored or hardcoded
 */
export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey();
  return !!key && key.length > 0 && key !== 'MASUKKAN_KEY_GEMINI_ANDA_DISINI';
}
