// lib/firebase-admin.ts
import admin from 'firebase-admin';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import path from 'path';
import fs from 'fs';
import { getMessaging } from 'firebase-admin/messaging';

const serviceAccount = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'drug-rescuer-demo-firebase-adminsdk-fbsvc-2590cf8f72.json'), 'utf8')
  );
  

const app = !getApps().length
  ? initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  : getApp();

const messaging = getMessaging(app);
  
export { messaging,  admin };
