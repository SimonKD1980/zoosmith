export const ANIMAL_UPKEEP_BASE = 2;
export const ANIMAL_UPKEEP_RATE = 0.15;
export const EXHIBIT_SIZES = {
small:  { cost: 1000,  buildDays: 3,  label: "Small",  emoji: "🟢" },
medium: { cost: 2500,  buildDays: 6,  label: "Medium", emoji: "🟡" },
large:  { cost: 5000,  buildDays: 10, label: "Large",  emoji: "🔴" }
};
export const SIZE_RANK = { small: 1, medium: 2, large: 3 };
export function exhibitSizeOk(exhibitSize, requiredSize) { return SIZE_RANK[exhibitSize] >= SIZE_RANK[requiredSize]; }

export const FOOD_TYPES = {
hay:     { name: "Hay",     icon: "🌾", costPerUnit: 2, diet: "Herbivore", storageCap: 200, color: "#fbbf24" },
meat:    { name: "Meat",    icon: "🥩", costPerUnit: 5, diet: "Carnivore", storageCap: 100, color: "#ef4444" },
produce: { name: "Produce", icon: "🥬", costPerUnit: 3, diet: "Omnivore",  storageCap: 150, color: "#22c55e" }
};
export function getDietFoodType(diet) {
if (diet === "Herbivore") return "hay";
if (diet === "Carnivore") return "meat";
if (diet === "Omnivore") return "produce";
return "hay";
}

export const TIER_INFO = {
basic:     { label: "Basic",     color: "#22c55e", emoji: "🟢" },
advanced:  { label: "Advanced",  color: "#3b82f6", emoji: "🔵" },
exotic:    { label: "Exotic",    color: "#a855f7", emoji: "🟣" },
legendary: { label: "Legendary", color: "#fbbf24", emoji: "🌟" }
};

// Data loaded from JSON
export const data = { animals: [], upgrades: {}, facilities: {}, staff: [], amenities: {}, achievements: [], researchProjects: {} };

// Game State
const INITIAL_STATE = {
money: 10000, food: { hay: 30, meat: 20, produce: 15 }, day: 1, month: 1, year: 1, ticketPrice: 20,
exhibits: {}, builtEnclosures: {}, zooFacilities: [], hiredStaff: [], achievements: {},
animalCounters: {}, monthlyReports: [], moveState: { active: false, fromExhibit: null, animalIndex: null },
uiMode: "normal", pendingAnimal: null, activeUpgradeExhibit: null, bredAnimals: 0, animalsSold: 0,
daysSinceNewAnimal: 0, dailyVisitors: 0, visitorSpending: { food: 0, gifts: 0, total: 0 },
visitorComplaints: [], amenities: {}, visitorSatisfaction: 0, maintenance: { dailyMaintenanceCost: 0 },
completedResearch: [], activeResearch: null
};

export const state = JSON.parse(JSON.stringify(INITIAL_STATE));

export function resetState() {
const newState = JSON.parse(JSON.stringify(INITIAL_STATE));
for (const key in state) delete state[key];
Object.assign(state, newState);
}

export function toArray(value) {
if (!value) return [];
if (Array.isArray(value)) return value;
return [value];
}