// firebase-config.js
export const firebaseConfig = {
  apiKey: "AIzaSyArGe8B4_ptptY6EU1B5OWSVKEj_1mUnus",
  authDomain: "monitoriasite-eb2ad.firebaseapp.com",
  projectId: "monitoriasite-eb2ad",
  storageBucket: "monitoriasite-eb2ad.appspot.com",
  messagingSenderId: "992773117560",
  appId: "1:992773117560:web:d10679616fd64fe66c7f8d",
  measurementId: "G-80845BMJMZ"
};

// Exporta apenas a função de inicialização
export const initializeFirebase = () => {
  const app = firebase.initializeApp(firebaseConfig);
  return firebase.firestore(app);
};