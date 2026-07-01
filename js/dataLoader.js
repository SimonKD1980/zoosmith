import { data } from './state.js';

export async function loadShop() {
  try {
    const res = await fetch("../animals.json?nocache=" + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data.animals = await res.json();
    console.log(`✅ Loaded ${data.animals.length} animals`);
  } catch (e) {
    console.error("❌ Failed to load animals.json:", e);
  }
}

export async function loadResearch() {
  try {
    const res = await fetch("../research.json?nocache=" + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arr = await res.json();
    data.researchProjects = {};
    arr.forEach(item => data.researchProjects[item.id] = item);
    console.log(`✅ Loaded ${arr.length} research projects`);
  } catch (e) {
    console.error("❌ Failed to load research.json:", e);
  }
}

export async function loadUpgrades() {
  try {
    const res = await fetch("../upgrades.json?nocache=" + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arr = await res.json();
    data.upgrades = {};
    arr.forEach(item => data.upgrades[item.id] = item);
    console.log(`✅ Loaded ${arr.length} upgrades`);
  } catch (e) {
    console.error("❌ Failed to load upgrades.json:", e);
  }
}

export async function loadFacilities() {
  try {
    const res = await fetch("../facilities.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arr = await res.json();
    data.facilities = {};
    arr.forEach(item => data.facilities[item.id] = item);
    console.log(`✅ Loaded ${arr.length} facilities`);
  } catch (e) {
    console.error("❌ Failed to load facilities.json:", e);
  }
}

export async function loadStaff() {
  try {
    const res = await fetch("../staff.json?nocache=" + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data.staff = await res.json();
    console.log(`✅ Loaded ${data.staff.length} staff`);
  } catch (e) {
    console.error("❌ Failed to load staff.json:", e);
  }
}

export async function loadAmenities() {
  try {
    const res = await fetch("../amenities.json?nocache=" + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arr = await res.json();
    data.amenities = {};
    arr.forEach(item => data.amenities[item.id] = item);
    console.log(`✅ Loaded ${arr.length} amenities`);
  } catch (e) {
    console.error("❌ Failed to load amenities.json:", e);
  }
}

export async function loadAchievements() {
  try {
    const res = await fetch("../achievements.json?nocache=" + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data.achievements = await res.json();
    console.log(`✅ Loaded ${data.achievements.length} achievements`);
  } catch (e) {
    console.error("❌ Failed to load achievements.json:", e);
    data.achievements = [];
  }
}
