import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, orderBy, limit, updateDoc, increment }
from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
apiKey: "AIzaSyBZRRK6LopojbwniZ9iWQzmyiHdwu84Dcs",
authDomain: "zoo-tycoon-leaderboard.firebaseapp.com",
projectId: "zoo-tycoon-leaderboard",
storageBucket: "zoo-tycoon-leaderboard.firebasestorage.app",
messagingSenderId: "784281338962",
appId: "1:784281338962:web:485d7f315ead583bcfcb8b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Expose globally for leaderboard functions
window.firebaseDB = db;
window.firebaseModules = { doc, setDoc, getDoc, getDocs, collection, query, orderBy, limit, updateDoc, increment };
console.log("🔥 Firebase connected!");