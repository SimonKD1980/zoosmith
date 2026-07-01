import './firebase.js';
import { state, data, resetState } from './state.js';
import { loadShop, loadUpgrades, loadFacilities, loadStaff, loadAmenities, loadAchievements, loadResearch } from './dataLoader.js';
import { advanceDay, buildExhibit, checkAchievements } from './gameLogic.js';
import { closeBuyModal, closeAnimalInfo, closeBuildModal, closeUpgradeModal, cancelMove, confirmBuyAnimal, openBuyModal, openAnimalInfo, openUpgradeMenu } from './modals.js';
import { updateUI, showSection, renderShop, renderExhibits, renderAchievements, renderReports, renderFacilities, renderStaff, renderSupplies, renderResearch, renderVisitors, renderAmenities, renderLeaderboard, filterByCategory, changeLeaderboardCategory, savePlayerName } from './ui.js';

// --- SAVE / LOAD ---
export function saveGame() {
const saveData = { ...state }; delete saveData.moveState; delete saveData.pendingAnimal; delete saveData.activeUpgradeExhibit;
localStorage.setItem("zooSave", JSON.stringify(saveData));
}
export function loadGame() {
const raw = localStorage.getItem("zooSave"); if (!raw) return;
try {
const save = JSON.parse(raw); Object.assign(state, save);
state.moveState = { active: false, fromExhibit: null, animalIndex: null }; state.uiMode = "normal";
state.pendingAnimal = null; state.activeUpgradeExhibit = null;
state.daysSinceNewAnimal ??= 0; state.dailyVisitors ??= 0;
state.visitorSpending ??= { food: 0, gifts: 0, total: 0 }; state.visitorComplaints ??= [];
state.amenities ??= {}; state.visitorSatisfaction ??= 100;
for (const id in state.exhibits) { state.exhibits[id].animals ??= []; state.exhibits[id].upgrades ??= []; state.exhibits[id].size ??= "small"; }
console.log("Game loaded successfully");
} catch (e) { console.error("Failed to load save:", e); }
}
export function showMonthlyReport() {
const attraction = calculateAttraction(); const visitors = generateVisitors();
state.monthlyReports.unshift({ month: state.month, year: state.year, attraction, visitors, guestHappiness: calculateGuestHappiness(), income: visitors * state.ticketPrice * 30 });
renderReports();
}

// --- LEADERBOARD ---
let leaderboardPlayerId = null;
export function getPlayerId() { let id = localStorage.getItem('zooPlayerId'); if (!id) { id = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9); localStorage.setItem('zooPlayerId', id); } return id; }
export function getPlayerName() { return localStorage.getItem('zooPlayerName') || 'Anonymous Zookeeper'; }
export function setPlayerName(name) { localStorage.setItem('zooPlayerName', name); }
export async function submitToLeaderboard() {
if (!window.firebaseDB) return;
try {
const playerId = getPlayerId(); leaderboardPlayerId = playerId;
const { doc, setDoc, getDoc } = window.firebaseModules; const ref = doc(window.firebaseDB, 'leaderboard', playerId);
const snap = await getDoc(ref);
const stats = { name: getPlayerName(), money: state.money, animals: getAllAnimals().length, achievements: Object.keys(state.achievements).length, daysPlayed: (state.year - 1) * 360 + (state.month - 1) * 30 + state.day, visitors: state.dailyVisitors, lastUpdated: new Date().toISOString() };
if (snap.exists()) { const existing = snap.data(); stats.money = Math.max(stats.money, existing.money || 0); stats.animals = Math.max(stats.animals, existing.animals || 0); stats.achievements = Math.max(stats.achievements, existing.achievements || 0); stats.daysPlayed = Math.max(stats.daysPlayed, existing.daysPlayed || 0); await setDoc(ref, stats, { merge: true }); } 
else await setDoc(ref, stats);
} catch (e) { console.error("Leaderboard submit error:", e); }
}
export async function fetchLeaderboard(category = 'money', limitCount = 20) {
if (!window.firebaseDB) return [];
try { const { collection, query, orderBy, limit, getDocs } = window.firebaseModules; const q = query(collection(window.firebaseDB, 'leaderboard'), orderBy(category, 'desc'), limit(limitCount)); const snapshot = await getDocs(q); return snapshot.docs.map((doc, index) => ({ rank: index + 1, id: doc.id, ...doc.data() })); } 
catch (e) { console.error("Leaderboard fetch error:", e); return []; }
}
export async function getPlayerRank(category = 'money') {
if (!window.firebaseDB || !leaderboardPlayerId) return null;
try { const { collection, query, orderBy, getDocs } = window.firebaseModules; const q = query(collection(window.firebaseDB, 'leaderboard'), orderBy(category, 'desc')); const snapshot = await getDocs(q); const docs = snapshot.docs; const myIndex = docs.findIndex(d => d.id === leaderboardPlayerId); if (myIndex === -1) return null; return { rank: myIndex + 1, total: docs.length, data: docs[myIndex].data() }; } 
catch (e) { console.error("Rank fetch error:", e); return null; }
}

// --- EVENT LISTENERS ---
document.addEventListener("click", (e) => {
const tag = e.target.closest(".animalTag"); if (!tag) return;
const exhibitId = tag.dataset.exhibit; const index = parseInt(tag.dataset.index);
if (state.uiMode === "move") { state.moveState.animalIndex = index; import('./modals.js').then(m => m.renderDestinationSelection()); return; }
const animal = state.exhibits[exhibitId]?.animals?.[index]; if (animal) openAnimalInfo(animal, exhibitId, index);
});

document.getElementById("buildExhibitBtn").onclick = () => {
const modal = document.getElementById("buildModal"); const options = document.getElementById("buildSizeOptions"); options.innerHTML = "";
for (const size in EXHIBIT_SIZES) {
const info = EXHIBIT_SIZES[size]; const canAfford = state.money >= info.cost; const btn = document.createElement("button"); btn.className = "primary-btn"; btn.style.width = "100%"; btn.style.marginBottom = "8px"; btn.style.opacity = canAfford ? "1" : "0.5"; btn.style.cursor = canAfford ? "pointer" : "not-allowed";
btn.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center;"><div style="text-align: left;"><div style="font-weight: 800;">${info.emoji} ${info.label} Exhibit</div><div style="font-size: 0.8rem; opacity: 0.8;">⏱ ${info.buildDays} days to build</div></div><div style="font-weight: 800;">$${info.cost.toLocaleString()}</div></div>`;
if (canAfford) btn.onclick = () => { buildExhibit(size); closeBuildModal(); };
options.appendChild(btn);
}
modal.classList.add("active");
};

document.getElementById("endDayBtn").onclick = () => {
advanceDay();
// Re-render everything after day advances
updateUI(); renderExhibits(); renderAchievements(); renderVisitors(); renderSupplies(); renderResearch();
submitToLeaderboard(); saveGame();
if (state.day === 1) showMonthlyReport();
};

document.getElementById("resetGameBtn").onclick = () => {
if (!confirm("Are you sure you want to reset your zoo? This cannot be undone.")) return;
localStorage.removeItem("zooSave"); resetState();
["reports", "exhibits", "shop", "achievements", "staff", "facilities", "visitors", "amenities", "research", "supplies"].forEach(id => document.getElementById(id).innerHTML = "");
updateUI(); renderExhibits(); renderAchievements(); renderReports(); renderShop(); renderFacilities(); renderStaff(); renderSupplies(); renderResearch();
showToast("Zoo has been reset!", "info");
};

document.getElementById("confirmBuyBtn").onclick = () => {
confirmBuyAnimal();
updateUI(); renderExhibits();
};

// --- EXPOSE GLOBALS FOR HTML ONCLICK ---
window.showSection = showSection;
window.filterByCategory = filterByCategory;
window.closeBuyModal = closeBuyModal;
window.closeAnimalInfo = closeAnimalInfo;
window.closeBuildModal = closeBuildModal;
window.closeUpgradeModal = closeUpgradeModal;
window.cancelMove = cancelMove;
window.changeLeaderboardCategory = changeLeaderboardCategory;
window.savePlayerName = savePlayerName;

// We need to expose functions that are called from dynamically generated HTML strings
import('./gameLogic.js').then(m => {
window.buyFood = m.buyFood;
window.buyAmenity = m.buyAmenity;
window.startResearch = m.startResearch;
window.hireStaff = m.hireStaff;
window.buyFacility = m.buyFacility;
});

// --- INITIALIZATION ---
loadGame();
state.food ??= { hay: 30, meat: 20, produce: 15 };

Promise.all([
loadShop(), loadUpgrades(), loadFacilities(), loadStaff(), loadAmenities(), loadAchievements(), loadResearch()
]).then(() => {
updateUI();
renderShop();
renderExhibits();
checkAchievements();
renderAchievements();
renderReports();
renderFacilities();
renderStaff();
renderSupplies();
renderResearch();
leaderboardPlayerId = getPlayerId();
});

setInterval(saveGame, 10000);
window.addEventListener("beforeunload", saveGame);