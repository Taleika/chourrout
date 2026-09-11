import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAGzxuK782Uho7z-y3YQAKN_1VfrY0uUno',
  authDomain: 'chourrout-presupuestos.firebaseapp.com',
  projectId: 'chourrout-presupuestos',
  storageBucket: 'chourrout-presupuestos.firebasestorage.app',
  messagingSenderId: '445746574968',
  appId: '1:445746574968:web:4a7e51a11112184b559f8d'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth, firebaseConfig };
