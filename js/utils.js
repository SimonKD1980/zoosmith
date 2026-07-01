import { state, data, toArray } from './state.js';

export function getAllAnimals() { return Object.values(state.exhibits).flatMap(ex => ex.animals || []); }
export function countAnimals(id) { return getAllAnimals().filter(a => a.id === id).length; }
export function getNextAnimalName(speciesName) {
if (!state.animalCounters[speciesName]) state.animalCounters[speciesName] = 1;
const name = `${speciesName} ${state.animalCounters[speciesName]}`;
state.animalCounters[speciesName]++;
return name;
}
export function pickVariation(animal) {
if (!animal.variations || animal.variations.length === 0) return null;
const roll = Math.random() * 100; let total = 0;
for (const v of animal.variations) { total += v.chance; if (roll < total) return v; }
return animal.variations[0];
}
export function addTicker(message) { document.getElementById("ticker").textContent = message; console.log("[Zoo Event]", message); }
export function showToast(message, type = 'info') {
const container = document.getElementById('toast-container');
const toast = document.createElement('div');
toast.className = `toast ${type}`; toast.textContent = message;
container.appendChild(toast);
setTimeout(() => toast.remove(), 3000);
}
export function showFloatingMoney(amount) {
if (amount === 0) return;
const header = document.querySelector('.stats-bar'); if (!header) return;
const el = document.createElement('span');
el.className = `floating-money ${amount >= 0 ? 'positive' : 'negative'}`;
el.textContent = (amount >= 0 ? '+' : '') + '$' + Math.abs(amount).toLocaleString();
header.style.position = 'relative'; header.appendChild(el);
el.style.left = (Math.random() * 100) + 'px'; el.style.top = '0px';
setTimeout(() => el.remove(), 1500);
}
export function getKeeperSlots() {
let total = 0;
for (const staffId of state.hiredStaff) {
const staff = data.staff.find(s => s.id === staffId);
if (staff && staff.keeperSlots) total += staff.keeperSlots;
} return total;
}
export function getAnimalSlotCost(animal) {
const size = animal.requiredExhibitSize || "small";
if (size === "large") return 3; if (size === "medium") return 2; return 1;
}
export function getUsedSlots() {
let used = 0;
for (const id in state.exhibits) for (const animal of state.exhibits[id].animals) used += getAnimalSlotCost(animal);
return used;
}
export function getAvailableSlots() { return getKeeperSlots() - getUsedSlots(); }
export function isUnderstaffed() { return getUsedSlots() > getKeeperSlots(); }
export function getStaffEffects() {
const effects = { visitorHappiness: 0, animalHappiness: 0, breedingBonus: 0, cleanPark: 0, cleanExhibits: 0 };
for (const staffId of state.hiredStaff) {
const staff = data.staff.find(s => s.id === staffId);
if (staff && staff.effects) for (const effect in staff.effects) if (effect !== 'maxStaff' && effects[effect] !== undefined) effects[effect] += staff.effects[effect];
} return effects;
}
export function countStaff(staffId) { return state.hiredStaff.filter(id => id === staffId).length; }
export function getGameStats() {
const allAnimals = getAllAnimals(); const species = new Set(allAnimals.map(a => a.id));
const totalUpgrades = Object.values(state.exhibits).reduce((sum, ex) => sum + (ex.upgrades?.length || 0), 0);
const maxHappiness = Math.max(0, ...Object.values(state.exhibits).map(ex => getExhibitHappiness(ex)));
const totalAmenities = Object.values(state.amenities).reduce((sum, count) => sum + count, 0);
return { totalAnimals: allAnimals.length, speciesCount: species.size, money: state.money, exhibitsCount: Object.keys(state.exhibits).length, totalUpgrades, maxHappiness, totalDays: (state.year - 1) * 360 + (state.month - 1) * 30 + state.day, bredAnimals: state.bredAnimals, animalsSold: state.animalsSold, hasRareVariant: allAnimals.some(a => a.variation?.rare), totalAmenities, visitorSatisfaction: state.visitorSatisfaction };
}
export function isResearchComplete(projectId) { return state.completedResearch.includes(projectId); }
export function canStartResearch(projectId) {
const project = data.researchProjects[projectId]; if (!project) return false;
if (isResearchComplete(projectId)) return false; if (state.activeResearch) return false;
if (project.requires && !isResearchComplete(project.requires)) return false; if (state.money < project.cost) return false;
return true;
}
export function evaluateCheck(check, stats) {
if (!check) return false;
if (check.type === 'hasRareVariant') return stats.hasRareVariant === true;
if (check.type === 'speciesCollection') { const totalSpecies = data.animals.length; if (totalSpecies === 0) return false; return (stats.speciesCount / totalSpecies) * 100 >= check.value; }
const value = stats[check.type]; if (typeof value === 'number' && typeof check.value === 'number') return value >= check.value;
return false;
}
export function getExhibitHappiness(exhibit) {
if (!exhibit || !exhibit.animals?.length) return 0; let total = 0;
exhibit.animals.forEach(animal => {
let happiness = 100; const count = exhibit.animals.filter(a => a.id === animal.id).length;
if (count < animal.minInExhibit) happiness = (count / animal.minInExhibit) * 100;
if (count > animal.maxInExhibit) happiness = Math.max(0, 100 - ((count - animal.maxInExhibit) * 20));
const upgrades = exhibit.upgrades || [];
toArray(animal.preferredShelter).forEach(pref => { if (upgrades.includes(pref)) happiness += 10; });
toArray(animal.preferredDecorations).forEach(pref => { if (upgrades.includes(pref)) happiness += 5; });
toArray(animal.preferredFacilities).forEach(pref => { if (upgrades.includes(pref)) happiness += 5; });
toArray(animal.dislikedShelter).forEach(pref => { if (upgrades.includes(pref)) happiness -= 15; });
toArray(animal.dislikedDecorations).forEach(pref => { if (upgrades.includes(pref)) happiness -= 10; });
toArray(animal.dislikedFacilities).forEach(pref => { if (upgrades.includes(pref)) happiness -= 10; });
if (animal.wasHungry) { happiness -= 30; delete animal.wasHungry; }
if (isUnderstaffed()) happiness -= 20;
total += happiness;
});
let avgHappiness = Math.round(total / exhibit.animals.length);
const staffEffects = getStaffEffects();
avgHappiness += staffEffects.animalHappiness; avgHappiness += staffEffects.cleanExhibits * 0.5;
return Math.min(100, avgHappiness);
}
export function calculateGuestHappiness() {
let happiness = 50;
if (state.zooFacilities.length >= 1) happiness += 10;
if (calculateAttraction() > 50) happiness += 10;
const avgAnimalHappiness = Object.keys(state.exhibits).length ? Object.values(state.exhibits).reduce((sum, ex) => sum + getExhibitHappiness(ex), 0) / Object.keys(state.exhibits).length : 0;
if (avgAnimalHappiness > 80) happiness += 15;
const staffEffects = getStaffEffects();
happiness += staffEffects.visitorHappiness; happiness += staffEffects.cleanPark * 0.3;
return Math.max(0, Math.min(100, Math.round(happiness)));
}
// Imported from gameLogic to avoid circular dependency issues in some bundlers, but fine in browser
import { calculateAttraction } from './gameLogic.js'; 