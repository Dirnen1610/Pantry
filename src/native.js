// Pont entre la page et les fonctions natives d'Android.
// Assemblé en www/native.js par esbuild pendant la compilation.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

window.GM_NATIVE = { Capacitor, App, LocalNotifications, BarcodeScanner };
