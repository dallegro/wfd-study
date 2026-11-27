// Keep storage failures non-fatal. Storage is injectable for Node tests.
export function readStored(key, storage) {
  try {
    return JSON.parse((storage ?? globalThis.localStorage).getItem(key) || 'null');
  } catch {
    return null;
  }
}

export function writeStored(key, value, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
