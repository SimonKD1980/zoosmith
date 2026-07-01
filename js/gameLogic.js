import { state, data, FOOD_TYPES, getDietFoodType, toArray, EXHIBIT_SIZES } from './state.js';
import { showToast, showFloatingMoney, addTicker, getAllAnimals, getExhibitHappiness, isUnderstaffed, getStaffEffects, getGameStats, evaluateCheck, isResearchComplete, calculateGuestHappiness } from './utils.js';

export function calculateAttraction() {
let score = 0;
for (const id in state.exhibits) { const ex = state.exhibits[id]; ex.animals.forEach(animal => score += animal.attractionValue || 10); score += getExhibitHappiness(ex) * 0.5; }
return score;
}
export function generateVisitors() {
const attraction = calculateAttraction(); if (attraction <= 0) return 0;
const baseVisitors = 5; const animalBonus = Math.floor(2 * Math.sqrt(attraction)); let visitors = baseVisitors + animalBonus;
const decayFactor = Math.min(1, state.daysSinceNewAnimal / 20); const noveltyMultiplier = 1 - (decayFactor * 0.4);
visitors = Math.floor(visitors * noveltyMultiplier); return Math.max(3, visitors);
}
export function processVisitorBehavior(visitors) {
state.visitorComplaints = []; state.visitorSpending = { food: 0, gifts: 0, total: 0 };
const staffEffects = getStaffEffects(); const cleanlinessFactor = Math.min(0.8, staffEffects.cleanPark / 100);
for (const id in data.amenities) {
const amenity = data.amenities[id]; const count = state.amenities[id] || 0;
if (amenity.capacity > 0 && count > 0) {
const totalCapacity = count * amenity.capacity;
if (id === 'restroom') { const restroomTurnover = 15; const effectiveCapacity = totalCapacity * restroomTurnover; const restroomVisits = Math.ceil(visitors * 0.8); if (effectiveCapacity < restroomVisits) { state.visitorComplaints.push({ icon: amenity.icon, text: `A few visitors complained about long ${amenity.name.toLowerCase()} lines.`, type: "warning", time: new Date().toLocaleTimeString() }); state.visitorSatisfaction -= 2 * (1 - cleanlinessFactor); } }
else if (id === 'bin') { const binsNeeded = Math.ceil(visitors / amenity.capacity); if (count < binsNeeded && visitors > 20) { state.visitorComplaints.push({ icon: amenity.icon, text: `Trash is overflowing! Not enough ${amenity.name.toLowerCase()}s.`, type: "warning", time: new Date().toLocaleTimeString() }); state.visitorSatisfaction -= 3 * (1 - cleanlinessFactor); } }
else { const peakNeeded = Math.ceil(visitors * 0.20); if (totalCapacity < peakNeeded * 0.5) { state.visitorComplaints.push({ icon: amenity.icon, text: `Some tired visitors couldn't find a place to sit.`, type: "warning", time: new Date().toLocaleTimeString() }); state.visitorSatisfaction -= 3 * (1 - cleanlinessFactor); } }
}
}
for (const id in data.amenities) {
const amenity = data.amenities[id]; const count = state.amenities[id] || 0;
if (amenity.revenue > 0 && count > 0) {
let buyerPercentage = 0.3;
if (id.includes('food') || id.includes('restaurant') || id.includes('cafe')) buyerPercentage = 0.50;
else if (id.includes('gift') || id.includes('shop') || id.includes('store')) buyerPercentage = 0.20;
const potentialBuyers = Math.floor(visitors * buyerPercentage); const maxServed = count * (amenity.maxCustomers || 50);
const actualBuyers = Math.min(potentialBuyers, maxServed); const revenue = actualBuyers * amenity.revenue;
if (revenue > 0) {
if (id.includes('food') || id.includes('restaurant') || id.includes('cafe')) state.visitorSpending.food += revenue;
else state.visitorSpending.gifts += revenue;
state.money += revenue; if (revenue > 0) showFloatingMoney(revenue);
}
if (count === 0 && visitors > 30 && buyerPercentage >= 0.4) { state.visitorComplaints.push({ icon: amenity.icon || "🏪", text: `Some hungry visitors left to find food elsewhere.`, type: "info", time: new Date().toLocaleTimeString() }); state.visitorSatisfaction -= 2 * (1 - cleanlinessFactor); }
}
}
state.visitorSpending.total = state.visitorSpending.food + state.visitorSpending.gifts;
let baseSatisfaction = 0;
if ((state.amenities.restroom || 0) > 0) baseSatisfaction += 20;
if ((state.amenities.bin || 0) > 0) baseSatisfaction += 15;
if ((state.amenities.bench || 0) > 0) baseSatisfaction += 15;
if ((state.amenities.food_stand || 0) > 0) baseSatisfaction += 20;
if ((state.amenities.gift_shop || 0) > 0) baseSatisfaction += 10;
const totalAmenities = Object.values(state.amenities).reduce((sum, count) => sum + count, 0);
baseSatisfaction += Math.min(20, totalAmenities * 2);
const penalty = state.visitorComplaints.reduce((sum, c) => sum + (c.type === 'warning' ? 5 : c.type === 'info' ? 2 : 3), 0);
state.visitorSatisfaction = Math.max(0, Math.min(100, baseSatisfaction - penalty));
}
export function processDayIncome() {
const visitors = generateVisitors(); state.dailyVisitors = visitors;
const ticketIncome = visitors * state.ticketPrice; state.money += ticketIncome;
let totalCost = 0;
for (const id of state.hiredStaff) { const staff = data.staff.find(s => s.id === id); if (staff) totalCost += staff.salary; }
state.money -= totalCost; processVisitorBehavior(visitors);
}
export function processUpkeep() {
let totalCost = 0;
for (const id in state.exhibits) totalCost += 5;
state.money -= totalCost; if (totalCost > 0) addTicker(`🧾 Facility upkeep: -$${totalCost}`);
}
export function consumeDailyFood() {
const consumption = { hay: 0, meat: 0, produce: 0 }; const hungryAnimals = [];
for (const id in state.exhibits) for (const animal of state.exhibits[id].animals) { const foodType = getDietFoodType(animal.diet); consumption[foodType] += animal.isPregnant ? 2 : 1; }
for (const foodType in consumption) {
const needed = consumption[foodType]; const available = state.food[foodType] || 0;
if (available >= needed) state.food[foodType] -= needed;
else {
const shortage = needed - available; state.food[foodType] = 0; let hungryCount = 0;
for (const id in state.exhibits) for (const animal of state.exhibits[id].animals) if (getDietFoodType(animal.diet) === foodType) { hungryCount++; animal.wasHungry = true; }
if (hungryCount > 0) hungryAnimals.push(`${FOOD_TYPES[foodType].icon} ${hungryCount} animals hungry!`);
}
}
if (hungryAnimals.length > 0) { addTicker(`⚠️ ${hungryAnimals.join(', ')}`); showToast("Animals are hungry! Buy more food!", "error"); }
return consumption;
}
export function tryBreeding(exhibit) {
const animals = exhibit.animals; if (!animals || animals.length < 2) return;
const groups = {}; animals.forEach(a => { if (!groups[a.id]) groups[a.id] = []; groups[a.id].push(a); });
for (const species in groups) {
const group = groups[species]; const males = group.filter(a => a.gender === "male"); const females = group.filter(a => a.gender === "female" && !a.isPregnant);
if (males.length === 0 || females.length === 0) continue; if (getExhibitHappiness(exhibit) < 100) continue;
const animalData = group[0]; const baseChance = animalData.breedChance ?? 0.1; const staffEffects = getStaffEffects();
const chance = baseChance * (1 + staffEffects.breedingBonus);
if (Math.random() < chance) {
const mother = females[Math.floor(Math.random() * females.length)]; const father = males[Math.floor(Math.random() * males.length)];
const speciesData = data.animals.find(a => a.id === species); const gestationDays = speciesData?.gestationDays || 10;
mother.isPregnant = true; mother.daysUntilBirth = gestationDays; mother.babySpecies = species; mother.babyFather = father.name;
state.daysSinceNewAnimal = 0; addTicker(`🤰 ${mother.name} is pregnant! Baby due in ${gestationDays} days.`); showToast(`${mother.name} is expecting! 🍼`, "info");
}
}
}
export function checkAchievements() {
const stats = getGameStats(); let changed = false;
for (const a of data.achievements) { if (!a.check) continue; if (!state.achievements[a.id] && evaluateCheck(a.check, stats)) { state.achievements[a.id] = true; addTicker(`🏆 Achievement unlocked: ${a.name}`); changed = true; } }
if (changed) { /* UI updates handled in main.js */ }
}
export function processDailyMaintenance() {
for (const id in state.exhibits) { const ex = state.exhibits[id]; if (ex.buildDaysRemaining > 0) { ex.buildDaysRemaining--; if (ex.buildDaysRemaining === 0) { state.builtEnclosures[id] = true; addTicker(`✅ ${ex.name} is now complete!`); showToast(`${ex.name} finished building! 🎉`, "info"); } } }
let maintenanceCost = 0;
for (const id in data.amenities) { const count = state.amenities[id] || 0; const amenity = data.amenities[id]; if (count > 0 && amenity.maintenanceCost > 0) maintenanceCost += count * amenity.maintenanceCost; }
state.maintenance.dailyMaintenanceCost = maintenanceCost; state.money -= maintenanceCost;
if (maintenanceCost > 0) addTicker(`🧹 Daily maintenance: -$${maintenanceCost}`);
}
export function advanceDay() {
if (state.activeEvent) { showToast("Resolve the current event before ending the day!", "warn"); return; }
const startMoney = state.money; processDayIncome(); processUpkeep(); processDailyMaintenance(); consumeDailyFood();
const delta = state.money - startMoney; if (delta !== 0) showFloatingMoney(delta);
state.daysSinceNewAnimal++;
for (const id in state.exhibits) tryBreeding(state.exhibits[id]);
for (const id in state.exhibits) {
const exhibit = state.exhibits[id];
for (const animal of exhibit.animals) {
if (animal.isPregnant) {
animal.daysUntilBirth--;
if (animal.daysUntilBirth <= 0) {
const species = animal.babySpecies || animal.id; const speciesData = data.animals.find(a => a.id === species);
const baby = { id: species, name: getNextAnimalName(speciesData?.name || species), gender: Math.random() < 0.5 ? "male" : "female", ageDays: 0, dailyIncome: animal.dailyIncome, foodCost: animal.foodCost, diet: animal.diet, variation: null, compatibleWith: animal.compatibleWith, minInExhibit: animal.minInExhibit, maxInExhibit: animal.maxInExhibit, breedChance: animal.breedChance, bornInZoo: true };
exhibit.animals.push(baby); animal.isPregnant = false; delete animal.daysUntilBirth; delete animal.babySpecies; delete animal.babyFather;
state.bredAnimals++; addTicker(`🍼 ${baby.name} was born to ${animal.name}!`); showToast(`🎉 ${baby.name} has been born!`, "info");
}
}
}
}
if (state.activeResearch) {
state.activeResearch.daysRemaining--;
if (state.activeResearch.daysRemaining <= 0) {
const project = data.researchProjects[state.activeResearch.projectId]; state.completedResearch.push(state.activeResearch.projectId); state.activeResearch = null;
if (project) { addTicker(`🎉 Research complete: ${project.name}!`); showToast(`🔬 ${project.name} complete! ${project.unlocks.length} new animals unlocked!`, "info"); }
}
}
state.day++;
if (state.day > 30) { state.day = 1; state.month++; /* showMonthlyReport() called in main.js */ }
if (state.month > 12) { state.month = 1; state.year++; }
checkAchievements(); triggerRandomEvent();
}
export function startResearch(projectId) {
const project = data.researchProjects[projectId]; if (!project) return;
if (!canStartResearch(projectId)) {
if (state.activeResearch) return showToast("Lab is busy with another project!", "warn");
if (state.money < project.cost) return showToast(`Need $${project.cost.toLocaleString()}!`, "error");
if (project.requires && !isResearchComplete(project.requires)) return showToast("Prerequisite research not complete!", "error");
return;
}
state.money -= project.cost; showFloatingMoney(-project.cost);
state.activeResearch = { projectId: project.id, daysRemaining: project.days };
addTicker(`🔬 Started research: ${project.name}`); showToast(`Research begun: ${project.name} (${project.days} days)`, "info");
}
export function buyFood(foodType, amount) {
try {
const food = FOOD_TYPES[foodType]; if (!food) return showToast("Unknown food type!", "error");
if (!state.food) state.food = { hay: 0, meat: 0, produce: 0 }; if (state.food[foodType] === undefined) state.food[foodType] = 0;
const current = state.food[foodType]; const spaceAvailable = food.storageCap - current; if (spaceAvailable <= 0) return showToast(`${food.name} storage is full!`, "error");
const actualAmount = Math.min(amount, spaceAvailable); let unitCost = food.costPerUnit;
if (actualAmount >= 100) unitCost = food.costPerUnit * 0.8; else if (actualAmount >= 50) unitCost = food.costPerUnit * 0.9;
const totalCost = Math.floor(unitCost * actualAmount); if (state.money < totalCost) return showToast(`Not enough money! Need $${totalCost}`, "error");
state.money -= totalCost; state.food[foodType] = current + actualAmount; showFloatingMoney(-totalCost);
const discountMsg = actualAmount !== amount ? ` (capped at ${actualAmount})` : ''; showToast(`Bought ${actualAmount} ${food.name}${discountMsg}`, "info");
} catch (e) { console.error("buyFood error:", e); showToast("Error buying food. Check console.", "error"); }
}
export function sellAnimal(animal, exhibitId) {
const exhibit = state.exhibits[exhibitId]; if (exhibit) exhibit.animals = exhibit.animals.filter(a => a !== animal);
const salePrice = Math.floor(animal.dailyIncome * 10); state.money += salePrice; showFloatingMoney(salePrice); state.animalsSold++;
addTicker(`💸 Sold ${animal.name} for $${salePrice}`);
}
export function buyUpgradeFromModal(upgradeId) {
const exhibit = state.exhibits[state.activeUpgradeExhibit]; const upgrade = data.upgrades[upgradeId]; if (!exhibit || !upgrade) return;
if (state.money < upgrade.cost) return showToast("Not enough money!", "error");
state.money -= upgrade.cost; showFloatingMoney(-upgrade.cost); exhibit.upgrades.push(upgradeId); addTicker(`🏗 Built ${upgrade.name}`);
}
export function sellUpgradeFromModal(upgradeId) {
const exhibit = state.exhibits[state.activeUpgradeExhibit]; const index = exhibit.upgrades.indexOf(upgradeId); if (index === -1) return;
const upgrade = data.upgrades[upgradeId]; exhibit.upgrades.splice(index, 1); const refund = Math.floor(upgrade.cost * 0.5);
state.money += refund; showFloatingMoney(refund); addTicker(`💰 Sold ${upgrade.name} for $${refund}`);
}
export function buyFacility(facilityId) {
const facility = data.facilities[facilityId]; if (!facility) return;
if (state.money < facility.cost) return showToast("Not enough money!", "error");
if (state.zooFacilities.includes(facilityId)) return showToast("You already own this facility!", "warn");
state.money -= facility.cost; showFloatingMoney(-facility.cost); state.zooFacilities.push(facilityId); addTicker(`🏗 Built ${facility.name} (Global)`);
}
export function buyAmenity(amenityId) {
const amenity = data.amenities[amenityId]; if (!amenity) return;
if (state.money < amenity.cost) return showToast("Not enough money!", "error");
state.money -= amenity.cost; showFloatingMoney(-amenity.cost);
if (!state.amenities[amenityId]) state.amenities[amenityId] = 0;
state.amenities[amenityId]++; addTicker(`🏪 Built ${amenity.name}`);
}
export function hireStaff(staffId) {
const staff = data.staff.find(s => s.id === staffId); if (!staff) return;
const hiredCount = countStaff(staffId); const maxStaff = staff.effects?.maxStaff || 99;
if (hiredCount >= maxStaff) return showToast(`Maximum ${staff.name}s hired!`, "warn");
if (state.money < staff.cost) return showToast("Not enough money!", "error");
state.money -= staff.cost; showFloatingMoney(-staff.cost); state.hiredStaff.push(staffId); addTicker(`👷 Hired ${staff.name}`);
}
export function moveAnimalTo(toId) {
const fromId = state.moveState.fromExhibit; const animal = state.exhibits[fromId].animals.splice(state.moveState.animalIndex, 1)[0]; if (!animal) return;
state.exhibits[toId].animals.push(animal); cancelMove();
}
export function cancelMove() { state.uiMode = "normal"; state.moveState = { active: false, fromExhibit: null, animalIndex: null }; }
export function buildExhibit(size) {
const info = EXHIBIT_SIZES[size]; if (state.money < info.cost) return showToast("Not enough money!", "error");
state.money -= info.cost; showFloatingMoney(-info.cost); const next = Object.keys(state.exhibits).length + 1; const id = "exhibit" + next;
state.exhibits[id] = { name: `Exhibit ${next}`, size: size, animals: [], upgrades: [], buildDaysRemaining: info.buildDays };
addTicker(`🏗 Started building ${info.label} Exhibit (ready in ${info.buildDays} days)`);
}

// Random Events (kept here for simplicity)
const RANDOM_EVENTS = [ /* ... paste your RANDOM_EVENTS array here ... */ ];
let currentEvent = null;
export function triggerRandomEvent() { return; /* ... paste your triggerRandomEvent logic here ... */ }
export function showEventModal(event) { /* ... paste logic ... */ }
