import { data } from './state.js';

export async function loadShop() {
try { const res = await fetch("animals.json?nocache=" + Date.now()); data.animals = await res.json(); } 
catch (e) { console.error("Failed to load animals", e); }
}
export async function loadResearch() {
try { const res = await fetch("research.json?nocache=" + Date.now()); const arr = await res.json(); data.researchProjects = {}; arr.forEach(item => data.researchProjects[item.id] = item); } 
catch (e) { console.error("Failed to load research", e); }
}
export async function loadUpgrades() {
try { const res = await fetch("upgrades.json?nocache=" + Date.now()); const arr = await res.json(); data.upgrades = {}; arr.forEach(item => data.upgrades[item.id] = item); } 
catch (e) { console.error("Failed to load upgrades", e); }
}
export async function loadFacilities() {
try { const res = await fetch("facilities.json"); const arr = await res.json(); data.facilities = {}; arr.forEach(item => data.facilities[item.id] = item); } 
catch (e) { console.error("Failed to load facilities", e); }
}
export async function loadStaff() {
try { const res = await fetch("staff.json?nocache=" + Date.now()); data.staff = await res.json(); } 
catch (e) { console.error("Failed to load staff", e); }
}
export async function loadAmenities() {
try { const res = await fetch("amenities.json?nocache=" + Date.now()); const arr = await res.json(); data.amenities = {}; arr.forEach(item => data.amenities[item.id] = item); } 
catch (e) { console.error("Failed to load amenities", e); }
}
export async function loadAchievements() {
try { const res = await fetch("achievements.json?nocache=" + Date.now()); data.achievements = await res.json(); } 
catch (e) { console.error("Failed to load achievements", e); data.achievements = []; }
}