// Pont entre la page et les fonctions natives d'Android + synchro du foyer.
// Assemblé en www/native.js par esbuild pendant la compilation.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Share } from '@capacitor/share';
import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentSingleTabManager,
  doc, collection, getDoc, getDocs, setDoc, writeBatch, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import config from './firebase-config.js';

window.GM_NATIVE = { Capacitor, App, LocalNotifications, BarcodeScanner, Share };

function createSync(cfg) {
  const app = initializeApp(cfg);
  const auth = initializeAuth(app, { persistence: indexedDBLocalPersistence });
  const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() })
  });
  const ready = new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (u) => { if (u) resolve(u); else signInAnonymously(auth).catch(reject); });
  });
  const foyer = (code) => doc(db, 'foyers', code);
  return {
    ready,
    async exists(code) { await ready; return (await getDoc(foyer(code))).exists(); },
    async create(code) { await ready; await setDoc(foyer(code), { cree: serverTimestamp() }); },
    async getAll(code, col) { await ready; return (await getDocs(collection(db, 'foyers', code, col))).docs.map((d) => d.data()); },
    listen(code, col, onData, onError) {
      let stop = () => {}, stopped = false;
      ready.then(() => {
        if (stopped) return;
        stop = onSnapshot(collection(db, 'foyers', code, col), { includeMetadataChanges: true },
          (snap) => onData(snap.docs.map((d) => d.data()), snap.metadata), onError);
      }, onError);
      return () => { stopped = true; stop(); };
    },
    write(code, ops) {
      const jobs = [];
      for (let i = 0; i < ops.length; i += 400) {
        const b = writeBatch(db);
        ops.slice(i, i + 400).forEach((o) => {
          const ref = doc(db, 'foyers', code, o.col, String(o.id));
          if (o.data) b.set(ref, o.data); else b.delete(ref);
        });
        jobs.push(b.commit());
      }
      return Promise.all(jobs);
    }
  };
}

window.GM_FB = config && config.apiKey ? createSync(config) : null;
