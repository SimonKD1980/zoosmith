import { state, data, EXHIBIT_SIZES } from './state.js';
import { showToast, showFloatingMoney, addTicker, getAvailableSlots, getAnimalSlotCost, getNextAnimalName, pickVariation } from './utils.js';
import { buildExhibit } from './gameLogic.js';

export function openBuyModal(animal) {
const modal = document.getElementById("buyModal"); const select = document.getElementById("exhibitSelect"); select.innerHTML = "";
const ids = Object.keys(state.exhibits); if (ids.length === 0) return showToast("You need to build an exhibit first!", "error");
for (const id of ids) { const opt = document.createElement("option"); opt.value = id; opt.textContent = state.exhibits[id].name; select.appendChild(opt); }
state.pendingAnimal = animal; modal.classList.add("active");
}
export function closeBuyModal() { document.getElementById("buyModal").classList.remove("active"); state.pendingAnimal = null; }
export function confirmBuyAnimal() {
const id = document.getElementById("exhibitSelect").value; const gender = document.getElementById("genderSelect").value; const animal = state.pendingAnimal;
if (!id || !animal) return; if (!state.builtEnclosures[id]) return showToast("Exhibit not built yet!", "error");
if (state.money < animal.cost) return showToast("Not enough money!", "error");
const exhibit = state.exhibits[id];
const incompatible = exhibit.animals.some(existing => existing.id !== animal.id && !animal.compatibleWith.includes(existing.id));
if (incompatible) return showToast("This animal cannot live with current exhibit animals!", "error");
const slotCost = getAnimalSlotCost(animal); const available = getAvailableSlots();
if (available < slotCost) return showToast(`Need ${slotCost} keeper slot${slotCost > 1 ? 's' : ''}! Only ${available} available. Hire more keepers!`, "error");
state.money -= animal.cost; showFloatingMoney(-animal.cost);
exhibit.animals.push({ id: animal.id, name: getNextAnimalName(animal.name), gender, dailyIncome: animal.dailyIncome, variation: pickVariation(animal), foodCost: animal.foodCost, diet: animal.diet, compatibleWith: animal.compatibleWith, minInExhibit: animal.minInExhibit, maxInExhibit: animal.maxInExhibit, preferredShelter: animal.preferredShelter || [], preferredDecorations: animal.preferredDecorations || [], preferredFacilities: animal.preferredFacilities || [], dislikedShelter: animal.dislikedShelter || [], dislikedDecorations: animal.dislikedDecorations || [], dislikedFacilities: animal.dislikedFacilities || [], bornInZoo: false });
state.daysSinceNewAnimal = 0; addTicker(`✨ A new ${animal.name} arrived! Visitor excitement is high!`); closeBuyModal();
}
export function openAnimalInfo(animal, exhibitId, index) {
const content = document.getElementById("animalInfoContent"); let pregnancyInfo = "";
if (animal.isPregnant) pregnancyInfo = `<div style="margin-top: 15px; padding: 12px; background: rgba(168, 85, 247, 0.1); border: 1px solid var(--purple); border-radius: 8px;"><h4 style="margin: 0 0 8px 0; color: var(--purple);">🤰 Pregnant</h4><p style="margin: 0; font-size: 0.9rem;">Due in <strong>${animal.daysUntilBirth}</strong> day${animal.daysUntilBirth !== 1 ? 's' : ''}<br>Father: <strong>${animal.babyFather || 'Unknown'}</strong><br><span style="color: var(--warn); font-size: 0.8rem;">🍖 +50% food cost during pregnancy</span></p></div>`;
content.innerHTML = `<h2>${animal.name}</h2><p>💰 Income: $${animal.dailyIncome}/day</p><p>🍖 Food: $${animal.foodCost || 2}/day</p><p>👥 Needs: ${animal.minInExhibit} - ${animal.maxInExhibit}</p><p>🏞 Exhibit: ${state.exhibits[exhibitId]?.name ?? "Unknown"}</p>${animal.variation ? `<p>✨ Variant: ${animal.variation.name}</p>` : ""}<p>🍼 Born in zoo: ${animal.bornInZoo ? "Yes" : "No"}</p>${pregnancyInfo}<div style="margin-top: 15px; display: flex; gap: 10px;"><button id="sellAnimalBtn" class="buildBtn">💸 Sell Animal</button><button id="moveFromInfoBtn" class="moveBtn">🔄 Move Animal</button></div>`;
document.getElementById("sellAnimalBtn").onclick = () => { import('./gameLogic.js').then(m => m.sellAnimal(animal, exhibitId)); closeAnimalInfo(); };
document.getElementById("moveFromInfoBtn").onclick = () => { closeAnimalInfo(); setTimeout(() => { state.uiMode = "move"; state.moveState.active = true; state.moveState.fromExhibit = exhibitId; state.moveState.animalIndex = index; renderMoveSelection(); }, 50); };
document.getElementById("animalInfoModal").classList.add("active");
}
export function closeAnimalInfo() { document.getElementById("animalInfoModal").classList.remove("active"); }
export function openUpgradeMenu(exhibitId) {
state.activeUpgradeExhibit = exhibitId; const exhibit = state.exhibits[exhibitId]; const box = document.getElementById("upgradeOptions"); box.innerHTML = "";
const allUpgrades = Object.keys(data.upgrades); if (allUpgrades.length === 0) return box.innerHTML = "<p>No upgrades available.</p>";
allUpgrades.forEach(id => {
const up = data.upgrades[id]; const isOwned = exhibit.upgrades.includes(id); const btn = document.createElement("button"); btn.className = "card";
btn.innerHTML = `<strong>${up.name}</strong><br>💰 ${isOwned ? "Sell for $" + Math.floor(up.cost * 0.5) : "$" + up.cost}`;
btn.onclick = () => { import('./gameLogic.js').then(m => isOwned ? m.sellUpgradeFromModal(id) : m.buyUpgradeFromModal(id)); openUpgradeMenu(state.activeUpgradeExhibit); };
box.appendChild(btn);
});
document.getElementById("upgradeModal").classList.add("active");
}
export function closeUpgradeModal() { document.getElementById("upgradeModal").classList.remove("active"); state.activeUpgradeExhibit = null; }
export function closeBuildModal() { document.getElementById("buildModal").classList.remove("active"); }
export function renderMoveSelection() {
const box = document.getElementById("exhibits"); const fromGroup = state.exhibits[state.moveState.fromExhibit];
box.innerHTML = `<div class="exhibitCard" style="grid-column: 1 / -1;"><div class="exhibit-header"><h3>🔄 Move Animal Mode</h3></div><div class="exhibit-body"><p>Step 1: Click an animal to move</p><div class="animalList">${fromGroup.animals.map((a, i) => `<span class="animalTag" data-index="${i}">${a.name}</span>`).join("")}</div><button class="danger-btn" onclick="cancelMove()">Cancel</button></div></div>`;
document.querySelectorAll(".animalTag").forEach(tag => { tag.onclick = () => { state.moveState.animalIndex = parseInt(tag.dataset.index); renderDestinationSelection(); }; });
}
export function renderDestinationSelection() {
const box = document.getElementById("exhibits"); const animal = state.exhibits[state.moveState.fromExhibit].animals[state.moveState.animalIndex];
box.innerHTML = `<div class="exhibitCard" style="grid-column: 1 / -1;"><div class="exhibit-header"><h3>📍 Move ${animal.name}</h3></div><div class="exhibit-body"><p>Step 2: Choose destination exhibit</p><button class="danger-btn" onclick="cancelMove()">Cancel</button></div></div>`;
Object.keys(state.exhibits).forEach(id => {
const div = document.createElement("div"); div.className = "exhibitCard";
div.innerHTML = `<div class="exhibit-header"><h3>🏞 ${state.exhibits[id].name}</h3></div><div class="exhibit-body"><p style="text-align:center; padding:10px;">Click to move here</p></div>`;
div.style.cursor = 'pointer'; div.onclick = () => import('./gameLogic.js').then(m => m.moveAnimalTo(id));
box.appendChild(div);
});
}