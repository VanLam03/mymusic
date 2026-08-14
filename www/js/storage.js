/* ==========================================================================
   SoundPulse Storage Service (IndexedDB & LocalStorage)
   ========================================================================== */

const DB_NAME = 'SoundPulseDB';
const DB_VERSION = 1;
let dbInstance = null;

export class StorageService {
  static async init() {
    if (dbInstance) return dbInstance;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = (e) => reject('Failed to open IndexedDB: ' + e);
      request.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('tracks')) {
          db.createObjectStore('tracks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('playlists')) {
          db.createObjectStore('playlists', { keyPath: 'id' });
        }
      };
    });
  }

  static async saveTrack(track) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tracks', 'readwrite');
      const store = tx.objectStore('tracks');
      const req = store.put(track);
      req.onsuccess = () => resolve(track);
      req.onerror = (e) => reject(e);
    });
  }

  static async getAllTracks() {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tracks', 'readonly');
      const store = tx.objectStore('tracks');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e);
    });
  }

  static async deleteTrack(id) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tracks', 'readwrite');
      const store = tx.objectStore('tracks');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e);
    });
  }

  /* --- Playlist Storage Methods --- */
  static async getAllPlaylists() {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('playlists', 'readonly');
      const store = tx.objectStore('playlists');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e);
    });
  }

  static async savePlaylist(playlist) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('playlists', 'readwrite');
      const store = tx.objectStore('playlists');
      const req = store.put(playlist);
      req.onsuccess = () => resolve(playlist);
      req.onerror = (e) => reject(e);
    });
  }

  static async deletePlaylist(id) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('playlists', 'readwrite');
      const store = tx.objectStore('playlists');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e);
    });
  }

  static async addTrackToPlaylist(playlistId, trackId) {
    const playlists = await this.getAllPlaylists();
    const target = playlists.find(p => p.id === playlistId);
    if (target) {
      if (!target.trackIds.includes(trackId)) {
        target.trackIds.push(trackId);
        await this.savePlaylist(target);
      }
    }
  }

  static async removeTrackFromPlaylist(playlistId, trackId) {
    const playlists = await this.getAllPlaylists();
    const target = playlists.find(p => p.id === playlistId);
    if (target) {
      target.trackIds = target.trackIds.filter(id => id !== trackId);
      await this.savePlaylist(target);
    }
  }

  static getFavorites() {
    try {
      const favs = localStorage.getItem('soundpulse_favorites');
      return favs ? JSON.parse(favs) : [];
    } catch (e) {
      return [];
    }
  }

  static saveFavorites(favArray) {
    localStorage.setItem('soundpulse_favorites', JSON.stringify(favArray));
  }

  static getEqSettings() {
    try {
      const eq = localStorage.getItem('soundpulse_eq');
      return eq ? JSON.parse(eq) : null;
    } catch (e) {
      return null;
    }
  }

  static saveEqSettings(eqData) {
    localStorage.setItem('soundpulse_eq', JSON.stringify(eqData));
  }
}
