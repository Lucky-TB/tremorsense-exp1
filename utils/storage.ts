// AsyncStorage utilities for data persistence

import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecordingSession, AppSettings } from '@/types';

const SESSIONS_KEY = '@tremorsense:sessions';
const SETTINGS_KEY = '@tremorsense:settings';

const DEFAULT_SETTINGS: AppSettings = {
  samplingRate: 'medium',
  recordingDuration: 10,
  theme: 'dark',
};

// Check if AsyncStorage is available
let isAsyncStorageAvailable = true;
try {
  // Test AsyncStorage availability
  if (!AsyncStorage || typeof AsyncStorage.getItem !== 'function') {
    isAsyncStorageAvailable = false;
  }
} catch (error) {
  console.warn('AsyncStorage not available, using in-memory fallback');
  isAsyncStorageAvailable = false;
}

// In-memory fallback storage
let memoryStorage: Record<string, string> = {};

/**
 * Save a recording session
 */
export async function saveSession(session: RecordingSession): Promise<void> {
  try {
    const sessions = await loadAllSessions();
    sessions.push(session);
    const data = JSON.stringify(sessions);
    
    if (isAsyncStorageAvailable) {
      await AsyncStorage.setItem(SESSIONS_KEY, data);
    } else {
      memoryStorage[SESSIONS_KEY] = data;
    }
  } catch (error) {
    console.error('Error saving session:', error);
    // Fallback to memory storage
    try {
      const sessions = await loadAllSessions();
      sessions.push(session);
      memoryStorage[SESSIONS_KEY] = JSON.stringify(sessions);
    } catch (fallbackError) {
      console.error('Fallback storage also failed:', fallbackError);
      throw error;
    }
  }
}

/**
 * Load all recording sessions
 */
export async function loadAllSessions(): Promise<RecordingSession[]> {
  try {
    let data: string | null = null;
    
    if (isAsyncStorageAvailable) {
      try {
        data = await AsyncStorage.getItem(SESSIONS_KEY);
      } catch (asyncError) {
        console.warn('AsyncStorage.getItem failed, trying fallback:', asyncError);
        isAsyncStorageAvailable = false;
        data = memoryStorage[SESSIONS_KEY] || null;
      }
    } else {
      data = memoryStorage[SESSIONS_KEY] || null;
    }
    
    if (!data) return [];
    
    const sessions = JSON.parse(data) as RecordingSession[];
    // Validate and filter out corrupted data
    return sessions.filter(session => 
      session.id &&
      session.timestamp &&
      session.accelerometer &&
      session.gyroscope &&
      session.magnitude
    );
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
}

/**
 * Delete a session by ID
 */
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const sessions = await loadAllSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    const data = JSON.stringify(filtered);
    
    if (isAsyncStorageAvailable) {
      try {
        await AsyncStorage.setItem(SESSIONS_KEY, data);
      } catch (asyncError) {
        isAsyncStorageAvailable = false;
        memoryStorage[SESSIONS_KEY] = data;
      }
    } else {
      memoryStorage[SESSIONS_KEY] = data;
    }
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}

/**
 * Delete multiple sessions
 */
export async function deleteSessions(sessionIds: string[]): Promise<void> {
  try {
    const sessions = await loadAllSessions();
    const filtered = sessions.filter(s => !sessionIds.includes(s.id));
    const data = JSON.stringify(filtered);
    
    if (isAsyncStorageAvailable) {
      try {
        await AsyncStorage.setItem(SESSIONS_KEY, data);
      } catch (asyncError) {
        isAsyncStorageAvailable = false;
        memoryStorage[SESSIONS_KEY] = data;
      }
    } else {
      memoryStorage[SESSIONS_KEY] = data;
    }
  } catch (error) {
    console.error('Error deleting sessions:', error);
    throw error;
  }
}

/**
 * Clear all sessions
 */
export async function clearAllSessions(): Promise<void> {
  try {
    if (isAsyncStorageAvailable) {
      try {
        await AsyncStorage.removeItem(SESSIONS_KEY);
      } catch (asyncError) {
        isAsyncStorageAvailable = false;
        delete memoryStorage[SESSIONS_KEY];
      }
    } else {
      delete memoryStorage[SESSIONS_KEY];
    }
  } catch (error) {
    console.error('Error clearing sessions:', error);
    throw error;
  }
}

/**
 * Load app settings
 */
export async function loadSettings(): Promise<AppSettings> {
  try {
    let data: string | null = null;
    
    if (isAsyncStorageAvailable) {
      try {
        data = await AsyncStorage.getItem(SETTINGS_KEY);
      } catch (asyncError) {
        isAsyncStorageAvailable = false;
        data = memoryStorage[SETTINGS_KEY] || null;
      }
    } else {
      data = memoryStorage[SETTINGS_KEY] || null;
    }
    
    if (!data) return DEFAULT_SETTINGS;
    
    const settings = JSON.parse(data) as AppSettings;
    return { ...DEFAULT_SETTINGS, ...settings };
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save app settings
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    const data = JSON.stringify(settings);
    
    if (isAsyncStorageAvailable) {
      try {
        await AsyncStorage.setItem(SETTINGS_KEY, data);
      } catch (asyncError) {
        isAsyncStorageAvailable = false;
        memoryStorage[SETTINGS_KEY] = data;
      }
    } else {
      memoryStorage[SETTINGS_KEY] = data;
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

/**
 * Export all sessions as JSON
 */
export async function exportSessionsAsJSON(): Promise<string> {
  const sessions = await loadAllSessions();
  return JSON.stringify(sessions, null, 2);
}

/**
 * Export all sessions as CSV
 */
export async function exportSessionsAsCSV(): Promise<string> {
  const sessions = await loadAllSessions();
  
  const headers = [
    'ID',
    'Timestamp',
    'Duration',
    'Mean Amplitude',
    'Variability',
    'Peak Amplitude',
    'Caffeine',
    'Sleep Deprived',
    'Stress',
    'Notes'
  ].join(',');
  
  const rows = sessions.map(session => [
    session.id,
    new Date(session.timestamp).toISOString(),
    session.duration,
    session.stats.meanAmplitude.toFixed(4),
    session.stats.variability.toFixed(4),
    session.stats.peakAmplitude.toFixed(4),
    session.context?.caffeine ? 'Yes' : 'No',
    session.context?.sleepDeprived ? 'Yes' : 'No',
    session.context?.stress ? 'Yes' : 'No',
    session.context?.notes || ''
  ].join(','));
  
  return [headers, ...rows].join('\n');
}
