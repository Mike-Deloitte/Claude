import AsyncStorage from '@react-native-async-storage/async-storage';

// One key holds everything. The version suffix lets a future schema migrate cleanly.
export const STORAGE_KEY = 'values-app:v1';
const BACKUP_KEY = 'values-app:v1:unreadable-backup';
const MAX_NAME_LENGTH = 40;

export function emptyState() {
  return { profiles: [], activeId: null };
}

// Returns the saved state, or an empty state when nothing is saved yet.
// If the saved text cannot be parsed, it is copied to a backup key first,
// so the next save does not silently destroy it.
export async function loadState() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw == null) return emptyState();

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.profiles)) {
      throw new Error('Saved data has an unexpected shape');
    }
    return { profiles: parsed.profiles, activeId: parsed.activeId ?? null };
  } catch (err) {
    await AsyncStorage.setItem(BACKUP_KEY, raw);
    return emptyState();
  }
}

export function saveState(state) {
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// The functions below are pure: they take a state and return a new one.
// App.js decides when to save the result.

export function getActiveProfile(state) {
  return state.profiles.find((p) => p.id === state.activeId) ?? null;
}

export function createProfile(state, name) {
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
  if (!trimmed) return state;

  const profile = {
    id: newId('pro'),
    name: trimmed,
    createdAt: new Date().toISOString(),
    sessions: [],
  };
  return {
    profiles: [...state.profiles, profile],
    // The first profile becomes active automatically; later ones do not steal focus.
    activeId: state.activeId ?? profile.id,
  };
}

export function switchProfile(state, id) {
  if (!state.profiles.some((p) => p.id === id)) return state;
  return { ...state, activeId: id };
}

export function deleteProfile(state, id) {
  const profiles = state.profiles.filter((p) => p.id !== id);
  const activeId =
    state.activeId === id ? profiles[0]?.id ?? null : state.activeId;
  return { profiles, activeId };
}

export function appendSession(state, profileId, session) {
  return {
    ...state,
    profiles: state.profiles.map((p) =>
      p.id === profileId ? { ...p, sessions: [...p.sessions, session] } : p
    ),
  };
}

export function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
