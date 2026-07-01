import { state, data, EXHIBIT_SIZES, FOOD_TYPES, TIER_INFO, toArray, getDietFoodType } from './state.js';
import { showToast, getAllAnimals, getExhibitHappiness, isUnderstaffed, getKeeperSlots, getUsedSlots, getAvailableSlots, getStaffEffects, countStaff, isResearchComplete, calculateGuestHappiness, addTicker, showFloatingMoney } from './utils.js';
import { calculateAttraction, generateVisitors } from './gameLogic.js';
import { openBuyModal, openUpgradeMenu } from './modals.js';

let currentCategory = 'all';
let currentSearch = '';

export function updateUI() {
  document.getElementById("money").textContent = state.money.toLocaleString(undefined, { maximumFractionDigits: 2 });
  document.getElementById("income").textContent = (state.dailyVisitors * state.ticketPrice).toLocaleString();
  document.getElementById("day").textContent = state.day;
  document.getElementById("month").textContent = state.month;
  document.getElementById("year").textContent = state.year;
  document.getElementById("ticketPrice").textContent = state.ticketPrice;
  
  const allAnimals = getAllAnimals();
  if (allAnimals.length === 0) {
    document.getElementById("novelty").textContent = "0%";
  } else {
    const decayFactor = Math.min(1, state.daysSinceNewAnimal / 10);
    const noveltyMultiplier = 1 - (decayFactor * 0.9);
    document.getElementById("novelty").textContent = Math.round(noveltyMultiplier * 100) + "%";
  }
  
  const slots = getKeeperSlots();
  const used = getUsedSlots();
  document.getElementById("staffSlots").textContent = `${used}/${slots}`;
  const staffingStatus = document.getElementById("staffingStatus");
  if (used > slots) staffingStatus.style.color = "var(--danger)";
  else staffingStatus.style.color = "var(--text)";
}

export function showSection(section, event) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(section).classList.add("active");
  document.querySelectorAll(".nav button").forEach(b => b.classList.remove("active"));
  if (event) event.target.classList.add("active");

  if (section === "shop") renderShop();
  if (section === "exhibits") renderExhibits();
  if (section === "research") renderResearch();
  if (section === "staff") renderStaff();
  if (section === "facilities") renderFacilities();
  if (section === "reports") renderReports();
  if (section === "visitors") renderVisitors();
  if (section === "amenities") renderAmenities();
  if (section === "leaderboard") renderLeaderboard();
  if (section === "supplies") renderSupplies();
  if (section === "achievements") renderAchievements();
}

export function renderShop() {
  const shop = document.getElementById("shop");
  if (!data.animals || data.animals.length === 0) {
    shop.innerHTML = '<p style="text-align:center; color:var(--muted);">Loading shop...</p>';
    return;
  }
  const categories = [...new Set(data.animals.map(a => a.category || 'Other'))].sort();
  
  let tabsHtml = `<button class="category-tab ${currentCategory === 'all' ? 'active' : ''}" onclick="filterByCategory('all')">All</button>`;
  categories.forEach(cat => {
    tabsHtml += `<button class="category-tab ${currentCategory === cat ? 'active' : ''}" onclick="filterByCategory('${cat}')">${cat}</button>`;
  });

  shop.innerHTML = `
    <div style="margin-bottom: 20px;">
      <div style="margin-bottom: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
        <input type="text" id="animalSearch" placeholder="🔍 Search animals..." value="${currentSearch}" oninput="currentSearch=this.value; renderShopGrid();" style="flex: 1; min-width: 200px; padding: 10px; background: #0b1220; color: var(--text); border: 1px solid #243042; border-radius: 8px;">
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 15px;">
        ${tabsHtml}
      </div>
    </div>
    <div id="shopGrid" class="grid-layout"></div>
  `;
  renderShopGrid();
}

export function filterByCategory(category) {
  currentCategory = category;
  renderShop();
}

export function renderShopGrid() {
  const grid = document.getElementById('shopGrid');
  if (!grid) return;

  let filtered = data.animals;
  if (currentCategory !== 'all') filtered = filtered.filter(a => (a.category || 'Other') === currentCategory);
  if (currentSearch) {
    const s = currentSearch.toLowerCase();
    filtered = filtered.filter(a => a.name.toLowerCase().includes(s) || a.id.toLowerCase().includes(s));
  }

  const unlocked = [];
  const locked = [];

  filtered.forEach(animal => {
    const achievementMet = !animal.unlock || state.achievements[animal.unlock];
    const researchMet = !animal.research || isResearchComplete(animal.research);
    if (achievementMet && researchMet) unlocked.push(animal);
    else locked.push(animal);
  });

  grid.innerHTML = '';

  unlocked.forEach(animal => {
    const tier = TIER_INFO[animal.tier || 'basic'];
    const card = document.createElement('div');
    card.className = 'premium-card';
    card.innerHTML = `
      <img src="${animal.image || 'https://via.placeholder.com/300x180?text=No+Image'}" class="shop-card-img" alt="${animal.name}">
      <div class="card-header">
        <h3>${animal.name} ${tier.emoji}</h3>
        <div class="subtitle">${animal.category || 'Other'}</div>
      </div>
      <div class="card-body">
        <div class="card-stats">
          <span class="stat-badge green">💰 $${animal.dailyIncome}/day</span>
          <span class="stat-badge warn">🍖 ${animal.foodCost || 2}/day</span>
          <span class="stat-badge blue">👥 ${animal.minInExhibit}-${animal.maxInExhibit}</span>
        </div>
        <p class="card-desc">${animal.desc || 'A wonderful addition to your zoo.'}</p>
        <div class="card-price">$${animal.cost.toLocaleString()}</div>
      </div>
      <div class="card-actions">
        <button class="primary-btn" onclick='openBuyModal(${JSON.stringify(animal).replace(/'/g, "&apos;")})'>Add to Zoo</button>
      </div>
    `;
    grid.appendChild(card);
  });

  if (locked.length > 0) {
    const lockedSection = document.createElement('div');
    lockedSection.setAttribute('data-locked-section', 'true');
    lockedSection.style.gridColumn = '1 / -1';
    lockedSection.innerHTML = `<h3 style="color: var(--muted); margin-top: 20px;">🔒 Locked Animals (${locked.length})</h3>`;
    grid.parentElement.appendChild(lockedSection);
    
    locked.forEach(animal => {
      const card = document.createElement('div');
      card.className = 'premium-card';
      card.style.opacity = '0.6';
      card.innerHTML = `
        <div class="card-header">
          <h3>🔒 ${animal.name}</h3>
          <div class="subtitle">${animal.unlock ? `Requires Achievement: ${animal.unlock}` : 'Requires Research'}</div>
        </div>
      `;
      grid.parentElement.appendChild(card);
    });
  }
}

export function renderExhibits() {
  const box = document.getElementById("exhibits");
  if (state.uiMode === "move") return; 
  box.innerHTML = '';
  
  if (Object.keys(state.exhibits).length === 0) {
    box.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: white;"><h2>No exhibits yet!</h2><p>Click "🏗 Build Exhibit" to get started.</p></div>';
    return;
  }

  for (const id in state.exhibits) {
    const ex = state.exhibits[id];
    const happiness = getExhibitHappiness(ex);
    const div = document.createElement("div");
    div.className = "exhibitCard";
    
    let animalsHtml = '';
    if (ex.animals && ex.animals.length > 0) {
      animalsHtml = `<div class="animalList">${ex.animals.map((a, i) => `<span class="animalTag" data-exhibit="${id}" data-index="${i}">${a.name} ${a.isPregnant ? '🤰' : ''}</span>`).join('')}</div>`;
    } else {
      animalsHtml = `<p style="color: #ccc; font-style: italic; text-align: center; padding: 20px;">Empty exhibit. Buy animals from the shop!</p>`;
    }

    let buildStatus = '';
    if (ex.buildDaysRemaining > 0) {
      buildStatus = `<div style="background: rgba(245, 158, 11, 0.2); padding: 10px; border-radius: 8px; text-align: center; color: var(--warn); font-weight: bold;">🚧 Under Construction (${ex.buildDaysRemaining} days left)</div>`;
    }

    div.innerHTML = `
      <div class="exhibit-header">
        <h3>🏞 ${ex.name} (${ex.size || 'small'})</h3>
      </div>
      <div class="exhibit-body">
        ${buildStatus}
        <div class="exhibit-stat"><span>😊 Happiness</span><strong>${happiness}%</strong></div>
        <div class="happiness-bar"><div class="happiness-fill" style="width: ${happiness}%"></div></div>
        <div class="exhibit-stat"><span>🐾 Animals</span><strong>${ex.animals ? ex.animals.length : 0}</strong></div>
        ${animalsHtml}
        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <button class="secondary-btn" style="flex:1" onclick="openUpgradeMenu('${id}')">⬆️ Upgrades</button>
          <button class="danger-btn" style="flex:1" onclick="demolishExhibit('${id}')">🧨 Demolish</button>
        </div>
      </div>
    `;
    box.appendChild(div);
  }
}

export function demolishExhibit(id) {
  if (!confirm(`Demolish ${state.exhibits[id].name}? You will lose all animals and get a 50% refund.`)) return;
  const group = state.exhibits[id];
  const baseCost = EXHIBIT_SIZES[group.size || 'small'].cost;
  const upgradeCosts = (group.upgrades || []).reduce((sum, uId) => sum + (data.upgrades[uId]?.cost || 0), 0);
  const refund = Math.floor((baseCost + upgradeCosts) * 0.5);
  state.money += refund;
  showFloatingMoney(refund);
  delete state.exhibits[id];
  delete state.builtEnclosures[id];
  addTicker(`💰 Demolished ${group.name} (refunded $${refund})`);
  updateUI(); renderExhibits();
}

export function renderStaff() {
  const grid = document.getElementById("staff");
  if (!data.staff || data.staff.length === 0) { grid.innerHTML = '<p>Loading staff...</p>'; return; }
  grid.innerHTML = '<div class="grid-layout"></div>';
  const layout = grid.querySelector('.grid-layout');

  const totalSlots = getKeeperSlots();
  const usedSlots = getUsedSlots();
  
  const summary = document.createElement('div');
  summary.style.gridColumn = '1 / -1';
  summary.className = 'premium-card';
  summary.innerHTML = `
    <div class="card-header"><h3>👷 Staff Overview</h3></div>
    <div class="card-body">
      <div class="card-stats">
        <span class="stat-badge blue">Total Slots: ${totalSlots}</span>
        <span class="stat-badge ${usedSlots > totalSlots ? 'danger' : 'green'}">Used Slots: ${usedSlots}</span>
      </div>
    </div>
  `;
  layout.appendChild(summary);

  data.staff.forEach(staff => {
    const hiredCount = countStaff(staff.id);
    const maxStaff = staff.effects?.maxStaff || 99;
    const isMaxed = hiredCount >= maxStaff;
    const canAfford = state.money >= staff.cost;

    const card = document.createElement('div');
    card.className = 'premium-card';
    card.innerHTML = `
      <div class="card-header">
        <span class="staff-icon">${staff.icon || '👤'}</span>
        <h3>${staff.name}</h3>
        <span class="role-badge">${staff.role || 'Staff'}</span>
      </div>
      <div class="card-body">
        <p class="card-desc">${staff.desc || ''}</p>
        <div class="card-stats">
          <span class="stat-badge warn">💵 $${staff.salary}/day</span>
          <span class="stat-badge blue">Hired: ${hiredCount}/${maxStaff}</span>
          ${staff.keeperSlots ? `<span class="stat-badge green">+${staff.keeperSlots} Slots</span>` : ''}
        </div>
        <div class="salary-highlight">$${staff.cost.toLocaleString()}</div>
      </div>
      <div class="card-actions">
        <button class="primary-btn" ${isMaxed || !canAfford ? 'disabled' : ''}>Hire ${staff.name}</button>
      </div>
    `;
    
const btn = card.querySelector('button');
if (!isMaxed && canAfford) {
  btn.onclick = () => {
    console.log(`👷 Hiring ${staff.name}...`);
    try {
      import('./gameLogic.js').then(m => {
        m.hireStaff(staff.id);
        console.log(`✅ ${staff.name} hired successfully!`);
        updateUI();
        renderStaff();
        import('./main.js').then(main => main.saveGame());
      }).catch(err => {
        console.error('❌ Error hiring staff:', err);
        showToast('Error hiring staff. Check console.', 'error');
      });
    } catch (err) {
      console.error('❌ Hire button error:', err);
      showToast('Error hiring staff. Check console.', 'error');
    }
  };
} else if (!canAfford) {
  btn.onclick = () => {
    showToast(`Need $${staff.cost.toLocaleString()}!`, 'error');
  };
}

export function renderFacilities() {
  const box = document.getElementById("facilities");
  if (!data.facilities || Object.keys(data.facilities).length === 0) { box.innerHTML = '<p>Loading facilities...</p>'; return; }
  box.innerHTML = '<div class="grid-layout"></div>';
  const grid = box.querySelector('.grid-layout');

  for (const id in data.facilities) {
    const fac = data.facilities[id];
    const isOwned = state.zooFacilities.includes(id);
    const card = document.createElement('div');
    card.className = 'premium-card';
    card.innerHTML = `
      <div class="card-header">
        <span class="facility-icon">${fac.icon || '🏢'}</span>
        <h3>${fac.name}</h3>
      </div>
      <div class="card-body">
        <p class="card-desc">${fac.desc || ''}</p>
        <div class="card-price">${isOwned ? '✅ Owned' : '$' + fac.cost.toLocaleString()}</div>
      </div>
      <div class="card-actions">
        <button class="primary-btn" ${isOwned || state.money < fac.cost ? 'disabled' : ''}>${isOwned ? 'Built' : 'Build Facility'}</button>
      </div>
    `;
    if (!isOwned) {
      card.querySelector('button').onclick = () => {
        import('./gameLogic.js').then(m => { m.buyFacility(id); updateUI(); renderFacilities(); });
      };
    }
    grid.appendChild(card);
  }
}

export function renderSupplies() {
  const box = document.getElementById("supplies");
  const consumption = { hay: 0, meat: 0, produce: 0 };
  
  for (const id in state.exhibits) {
    for (const animal of state.exhibits[id].animals) {
      const foodType = getDietFoodType(animal.diet);
      consumption[foodType] += animal.isPregnant ? 2 : 1;
    }
  }

  let html = '<div class="grid-layout">';
  for (const type in FOOD_TYPES) {
    const food = FOOD_TYPES[type];
    const current = state.food[type] || 0;
    const dailyNeed = consumption[type];
    const daysLeft = dailyNeed > 0 ? Math.floor(current / dailyNeed) : '∞';
    const percent = (current / food.storageCap) * 100;

    html += `
      <div class="premium-card">
        <div class="card-header">
          <h3>${food.icon} ${food.name}</h3>
          <div class="subtitle">Diet: ${food.diet}</div>
        </div>
        <div class="card-body">
          <div class="card-stats">
            <span class="stat-badge green">Stock: ${current}</span>
            <span class="stat-badge warn">Daily Need: ${dailyNeed}</span>
            <span class="stat-badge blue">Days Left: ${daysLeft}</span>
          </div>
          <div class="amenity-bar"><div class="amenity-fill" style="width: ${percent}%; background: ${food.color}"></div></div>
          <p class="card-desc">Capacity: ${current} / ${food.storageCap}</p>
        </div>
        <div class="card-actions" style="flex-direction: column; gap: 8px;">
          <button class="primary-btn" onclick="buyFood('${type}', 10)">Buy 10 ($${food.costPerUnit * 10})</button>
          <button class="secondary-btn" onclick="buyFood('${type}', 50)">Buy 50 (10% Off)</button>
          <button class="secondary-btn" onclick="buyFood('${type}', 100)">Buy 100 (20% Off)</button>
        </div>
      </div>
    `;
  }
  html += '</div>';
  box.innerHTML = html;
}

export function renderAmenities() {
  const box = document.getElementById("amenities");
  if (!data.amenities || Object.keys(data.amenities).length === 0) { box.innerHTML = '<p>Loading amenities...</p>'; return; }
  box.innerHTML = '<div class="grid-layout"></div>';
  const grid = box.querySelector('.grid-layout');

  for (const id in data.amenities) {
    const am = data.amenities[id];
    const count = state.amenities[id] || 0;
    const card = document.createElement('div');
    card.className = 'premium-card';
    card.innerHTML = `
      <div class="card-header"><h3>${am.icon || '🏪'} ${am.name}</h3></div>
      <div class="card-body">
        <div class="card-stats">
          <span class="stat-badge green">Owned: ${count}</span>
          ${am.revenue ? `<span class="stat-badge warn">💰 $${am.revenue}/customer</span>` : ''}
          ${am.capacity ? `<span class="stat-badge blue">👥 Cap: ${am.capacity}</span>` : ''}
        </div>
        <p class="card-desc">${am.desc || ''}</p>
        <div class="card-price">$${am.cost.toLocaleString()}</div>
      </div>
      <div class="card-actions">
        <button class="primary-btn" ${state.money < am.cost ? 'disabled' : ''}>Build ${am.name}</button>
      </div>
    `;
    card.querySelector('button').onclick = () => {
      import('./gameLogic.js').then(m => { m.buyAmenity(id); updateUI(); renderAmenities(); });
    };
    grid.appendChild(card);
  }
}

export function renderResearch() {
  const box = document.getElementById("research");
  if (!data.researchProjects || Object.keys(data.researchProjects).length === 0) { box.innerHTML = '<p>Loading research...</p>'; return; }
  box.innerHTML = '<div class="grid-layout"></div>';
  const grid = box.querySelector('.grid-layout');

  if (state.activeResearch) {
    const proj = data.researchProjects[state.activeResearch.projectId];
    const activeCard = document.createElement('div');
    activeCard.className = 'premium-card';
    activeCard.style.gridColumn = '1 / -1';
    activeCard.style.borderColor = 'var(--blue)';
    activeCard.innerHTML = `
      <div class="card-header"><h3>🔬 Active Research: ${proj.name}</h3></div>
      <div class="card-body">
        <p class="card-desc">${proj.desc}</p>
        <div class="card-stats"><span class="stat-badge blue">⏳ ${state.activeResearch.daysRemaining} days remaining</span></div>
      </div>
    `;
    grid.appendChild(activeCard);
  }

  for (const id in data.researchProjects) {
    const proj = data.researchProjects[id];
    const isDone = isResearchComplete(id);
    const isActive = state.activeResearch?.projectId === id;
    const prereqMet = !proj.requires || isResearchComplete(proj.requires);
    const canAfford = state.money >= proj.cost;

    const card = document.createElement('div');
    card.className = 'premium-card';
    if (isDone) card.style.opacity = '0.6';
    card.innerHTML = `
      <div class="card-header"><h3>${isDone ? '✅' : '🔬'} ${proj.name}</h3></div>
      <div class="card-body">
        <p class="card-desc">${proj.desc}</p>
        <div class="card-stats">
          <span class="stat-badge warn">⏱ ${proj.days} days</span>
          ${proj.requires ? `<span class="stat-badge ${prereqMet ? 'green' : 'danger'}">Requires: ${proj.requires}</span>` : ''}
        </div>
        <div class="card-price">${isDone ? 'Completed' : '$' + proj.cost.toLocaleString()}</div>
      </div>
      <div class="card-actions">
        <button class="primary-btn" ${isDone || isActive || state.activeResearch || !prereqMet || !canAfford ? 'disabled' : ''}>
          ${isDone ? 'Completed' : isActive ? 'In Progress' : state.activeResearch ? 'Lab Busy' : 'Start Research'}
        </button>
      </div>
    `;
    if (!isDone && !isActive && !state.activeResearch && prereqMet && canAfford) {
      card.querySelector('button').onclick = () => {
        import('./gameLogic.js').then(m => { m.startResearch(id); updateUI(); renderResearch(); });
      };
    }
    grid.appendChild(card);
  }
}

export function renderVisitors() {
  const box = document.getElementById("visitors");
  const totalSpending = state.visitorSpending.total || 0;
  const foodPercent = totalSpending > 0 ? Math.round((state.visitorSpending.food / totalSpending) * 100) : 0;
  const giftPercent = totalSpending > 0 ? Math.round((state.visitorSpending.gifts / totalSpending) * 100) : 0;
  
  box.innerHTML = `
    <div class="visitor-overview">
      <div class="visitor-stat-card"><h4>👥 Daily Visitors</h4><div class="stat-value blue">${state.dailyVisitors || 0}</div></div>
      <div class="visitor-stat-card"><h4>😊 Guest Happiness</h4><div class="stat-value warn">${calculateGuestHappiness()}%</div></div>
      <div class="visitor-stat-card"><h4>💸 Secondary Spend</h4><div class="stat-value green">$${totalSpending.toLocaleString()}</div></div>
      <div class="visitor-stat-card"><h4>✨ Novelty</h4><div class="stat-value gold">${document.getElementById('novelty')?.textContent || '100%'}</div></div>
    </div>
    <div class="spending-breakdown">
      <div class="spending-card"><h4>🍔 Food & Beverage</h4><div class="amount">$${(state.visitorSpending.food || 0).toLocaleString()}</div><div class="percentage">${foodPercent}% of secondary spend</div></div>
      <div class="spending-card"><h4>🎁 Gift Shops</h4><div class="amount">$${(state.visitorSpending.gifts || 0).toLocaleString()}</div><div class="percentage">${giftPercent}% of secondary spend</div></div>
    </div>
    <h3 style="margin-top: 20px;">📢 Visitor Feedback</h3>
    <div class="complaints-list">
      ${state.visitorComplaints && state.visitorComplaints.length > 0 ? 
        state.visitorComplaints.map(c => `<div class="complaint-item ${c.type}"><span class="complaint-icon">${c.icon || '⚠️'}</span><span class="complaint-text">${c.text}</span><span class="complaint-time">${c.time || ''}</span></div>`).join('') : 
        '<p style="text-align: center; color: var(--muted);">No complaints today! Visitors are happy.</p>'
      }
    </div>
  `;
}

export function renderReports() {
  const box = document.getElementById("reports");
  if (!state.monthlyReports || state.monthlyReports.length === 0) {
    box.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--muted);"><h3>No monthly reports yet.</h3><p>Reports are generated at the end of every month.</p></div>';
    return;
  }
  box.innerHTML = '';
  state.monthlyReports.forEach(report => {
    const card = document.createElement('div');
    card.className = 'report-card';
    card.innerHTML = `
      <div class="report-header"><h3>📊 Month ${report.month}, Year ${report.year}</h3></div>
      <div class="report-body">
        <div class="report-stat visitors"><div class="label">Avg Visitors/Day</div><div class="value">${report.visitors}</div></div>
        <div class="report-stat income"><div class="label">Monthly Income</div><div class="value">$${report.income.toLocaleString()}</div></div>
        <div class="report-stat happiness"><div class="label">Guest Happiness</div><div class="value">${report.guestHappiness}%</div></div>
        <div class="report-stat"><div class="label">Attraction Score</div><div class="value">${report.attraction}</div></div>
      </div>
    `;
    box.appendChild(card);
  });
}

export function renderAchievements() {
  const box = document.getElementById("achievements");
  if (!data.achievements || data.achievements.length === 0) { box.innerHTML = '<p>Loading achievements...</p>'; return; }
  box.innerHTML = '<div class="grid-layout"></div>';
  const grid = box.querySelector('.grid-layout');

  data.achievements.forEach(ach => {
    const isUnlocked = state.achievements[ach.id];
    const card = document.createElement('div');
    card.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
    card.innerHTML = `
      <span class="achievement-icon">${ach.icon || '🏆'}</span>
      <h3>${ach.name}</h3>
      <p>${ach.desc}</p>
      <div class="achievement-status ${isUnlocked ? 'done' : 'pending'}">${isUnlocked ? '✅ Unlocked' : '🔒 Locked'}</div>
    `;
    grid.appendChild(card);
  });
}

let leaderboardCategory = 'money';

export function renderLeaderboard() {
  const box = document.getElementById("leaderboard");
  box.innerHTML = `
    <div class="name-prompt">
      <h3>🏆 Enter Your Zoo Name</h3>
      <input type="text" id="playerNameInput" placeholder="e.g. Safari King" value="${localStorage.getItem('zooPlayerName') || ''}">
      <button class="primary-btn" onclick="savePlayerName()">Save Name</button>
    </div>
    <div class="your-rank-card" id="yourRankCard">
      <h3>Your Global Rank</h3>
      <div class="your-rank-number" id="yourRankNumber">Calculating...</div>
    </div>
    <div class="leaderboard-tabs">
      <button class="leaderboard-tab ${leaderboardCategory === 'money' ? 'active' : ''}" onclick="changeLeaderboardCategory('money')">💰 Money</button>
      <button class="leaderboard-tab ${leaderboardCategory === 'animals' ? 'active' : ''}" onclick="changeLeaderboardCategory('animals')">🐾 Animals</button>
      <button class="leaderboard-tab ${leaderboardCategory === 'daysPlayed' ? 'active' : ''}" onclick="changeLeaderboardCategory('daysPlayed')">📅 Days</button>
    </div>
    <div class="leaderboard-table" id="leaderboardTable">
      <div class="leaderboard-loading">Loading leaderboard...</div>
    </div>
  `;
  updateLeaderboardContent();
}

export function changeLeaderboardCategory(category) {
  leaderboardCategory = category;
  renderLeaderboard();
}

export async function updateLeaderboardContent() {
  const table = document.getElementById('leaderboardTable');
  const rankNum = document.getElementById('yourRankNumber');
  if (!table) return;

  try {
    const lb = await window.fetchLeaderboard(leaderboardCategory, 20);
    const myRank = await window.getPlayerRank(leaderboardCategory);
    
    if (rankNum) rankNum.textContent = myRank ? `#${myRank.rank} / ${myRank.total}` : 'Unranked';

    if (!lb || lb.length === 0) {
      table.innerHTML = '<div class="leaderboard-loading">No players yet. Be the first!</div>';
      return;
    }

    let html = `<div class="leaderboard-row header"><div>Rank</div><div>Zoo Name</div><div>Score</div></div>`;
    lb.forEach((p, i) => {
      const isYou = p.id === window.leaderboardPlayerId;
      const rankClass = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
      const scoreVal = p[leaderboardCategory] || 0;
      html += `
        <div class="leaderboard-row ${rankClass} ${isYou ? 'you' : ''}">
          <div class="rank-badge rank-${i+1}">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${p.rank}`}</div>
          <div class="player-info">
            <div class="player-name">${escapeHtml(p.name)} ${isYou ? '(You)' : ''}</div>
            <div class="player-zoo">${p.daysPlayed || 0} days played</div>
          </div>
          <div class="player-score">${typeof scoreVal === 'number' ? scoreVal.toLocaleString() : scoreVal}</div>
        </div>
      `;
    });
    table.innerHTML = html;
  } catch (e) {
    table.innerHTML = '<div class="leaderboard-loading">Failed to load leaderboard.</div>';
  }
}

export function savePlayerName() {
  const input = document.getElementById('playerNameInput');
  const name = input.value.trim();
  if (name.length < 2) { showToast("Name must be at least 2 characters", "error"); return; }
  localStorage.setItem('zooPlayerName', name);
  showToast(`Welcome, ${name}! 🎉`, "info");
  renderLeaderboard();
  if (window.submitToLeaderboard) window.submitToLeaderboard();
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}
