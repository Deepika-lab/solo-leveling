/**
 * app.js - Main Application Controller, 3D Engine Hooks, Leveling System, Penalty System & PWA
 */

class SoloLevelingApp {
  constructor() {
    this.state = window.StorageManager.loadState();
    this.activeTab = 'status';

    // Sub-managers
    this.quests = new window.QuestManager(this);
    this.dungeons = new window.DungeonManager(this);
    this.shadows = new window.ShadowManager(this);
    this.shop = new window.ShopManager(this);

    // 3D Visual Engine
    this.scene3D = new window.Scene3DManager();

    // PWA Install prompt listener
    this.deferredPrompt = null;
    this.initPWA();

    this.initEventListeners();
    this.initCardParallax();
    this.render();

    this.checkInitialStatus();
  }

  initPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const btn = document.getElementById('btn-install-app');
      if (btn) btn.classList.remove('hidden');
    });
  }

  checkInitialStatus() {
    if (this.state.penaltyEngaged) {
      setTimeout(() => {
        window.systemAudio.playWarning();
        this.triggerScreenShake();
      }, 800);
    } else if (this.state.level === 1 && this.state.currentXp === 0) {
      setTimeout(() => {
        window.systemAudio.playSystemAlert();
      }, 500);
    }
  }

  persistAndRender() {
    window.StorageManager.saveState(this.state);
    this.flashAutoSaveIndicator();
    this.render();
  }

  flashAutoSaveIndicator() {
    const el = document.getElementById('autosave-indicator');
    if (!el) return;
    el.classList.add('saving');
    clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => el.classList.remove('saving'), 1200);
  }

  triggerScreenShake() {
    document.body.classList.remove('screen-shake');
    void document.body.offsetWidth;
    document.body.classList.add('screen-shake');
    setTimeout(() => document.body.classList.remove('screen-shake'), 450);
  }

  showFloatingCombatText(x, y, text, type = 'xp') {
    const el = document.createElement('div');
    el.className = `floating-combat-text ${type}`;
    el.innerText = text;
    el.style.left = `${Math.max(10, Math.min(window.innerWidth - 140, x))}px`;
    el.style.top = `${Math.max(20, y)}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  initCardParallax() {
    document.addEventListener('mousemove', (e) => {
      const cards = document.querySelectorAll('.card-3d-tilt');
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        const dist = Math.hypot(dx, dy);

        if (dist < 320) {
          const rotX = -(dy / (rect.height / 2)) * 6;
          const rotY = (dx / (rect.width / 2)) * 6;
          card.style.transform = `perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`;
        } else {
          card.style.transform = '';
        }
      });
    });
  }

  // XP & Progression Engine
  addXp(amount, event = null) {
    this.state.currentXp += amount;
    if (event) {
      const rect = event.target.getBoundingClientRect();
      this.showFloatingCombatText(rect.left + 20, rect.top - 15, `+${amount} EXP!`, 'xp');
    }
    this.checkLevelUp();
    this.persistAndRender();
  }

  checkLevelUp() {
    let leveledUp = false;
    let oldLevel = this.state.level;
    let levelsGained = 0;

    let reqXp = window.HunterModels.getXpRequired(this.state.level);
    while (this.state.currentXp >= reqXp) {
      this.state.currentXp -= reqXp;
      this.state.level += 1;
      this.state.unallocatedPoints += 3;
      levelsGained += 1;
      leveledUp = true;
      reqXp = window.HunterModels.getXpRequired(this.state.level);
    }

    if (leveledUp) {
      this.healToFull();
      const currentRank = window.HunterModels.getHunterRank(this.state.level);

      if (this.state.level >= 25) this.unlockTitle('demon_hunter');
      if (this.state.level >= 50) this.unlockTitle('architect');

      window.systemAudio.playLevelUp();
      this.triggerScreenShake();
      this.openLevelUpCelebration(oldLevel, this.state.level, levelsGained * 3, currentRank);
    }
  }

  openLevelUpCelebration(oldLevel, newLevel, pointsGained, rank) {
    const modal = document.getElementById('levelup-celebration-modal');
    if (!modal) return;

    document.getElementById('celebration-level-text').innerText = `LEVEL ${oldLevel} ➔ LEVEL ${newLevel}`;
    document.getElementById('celebration-rank-badge').innerText = `${rank.rank}-RANK [${rank.title}]`;
    document.getElementById('celebration-points-text').innerText = `+${pointsGained} UNALLOCATED STAT POINTS`;

    modal.classList.remove('hidden');

    const btn = document.getElementById('btn-claim-levelup');
    btn.onclick = () => {
      window.systemAudio.playGateClear();
      modal.classList.add('hidden');
    };
  }

  healToFull() {
    this.state.currentHp = window.HunterModels.calculateMaxHp(this.state.stats.vit);
    this.state.currentMp = window.HunterModels.calculateMaxMp(this.state.stats.int);
  }

  allocateStat(statKey, event = null) {
    if (this.state.unallocatedPoints <= 0) return;
    this.state.unallocatedPoints -= 1;
    this.state.stats[statKey] += 1;

    if (statKey === 'vit') {
      const maxHp = window.HunterModels.calculateMaxHp(this.state.stats.vit);
      this.state.currentHp = Math.min(maxHp, this.state.currentHp + 20);
    }
    if (statKey === 'int') {
      const maxMp = window.HunterModels.calculateMaxMp(this.state.stats.int);
      this.state.currentMp = Math.min(maxMp, this.state.currentMp + 15);
    }

    if (event) {
      const rect = event.target.getBoundingClientRect();
      this.showFloatingCombatText(rect.left + 20, rect.top - 10, `+1 ${statKey.toUpperCase()}`, 'stat');
    }

    window.systemAudio.playStatAllocate();
    this.persistAndRender();
  }

  setHunterClass(classId) {
    this.state.job = classId;
    const classObj = window.HunterModels.HUNTER_CLASSES.find(c => c.id === classId);
    window.systemAudio.playGateClear();
    this.showNotification(`[CLASS AWAKENED] ${classObj.name}!`);
    this.persistAndRender();
  }

  unlockTitle(titleId) {
    if (!this.state.unlockedTitles) this.state.unlockedTitles = ['awakened'];
    if (!this.state.unlockedTitles.includes(titleId)) {
      this.state.unlockedTitles.push(titleId);
      const titleDef = window.HunterModels.DEFAULT_TITLES.find(t => t.id === titleId);
      if (titleDef) {
        window.systemAudio.playLevelUp();
        this.showNotification(`[TITLE UNLOCKED] "${titleDef.name}"!`);
      }
    }
  }

  setActiveTitle(titleName) {
    this.state.title = titleName;
    window.systemAudio.playClick();
    this.showNotification(`[TITLE EQUIPPED] ${titleName}`);
    this.persistAndRender();
  }

  showNotification(text) {
    const banner = document.getElementById('system-toast');
    if (!banner) return;
    banner.innerText = text;
    banner.classList.add('show');
    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      banner.classList.remove('show');
    }, 3800);
  }

  showModalNotification(title, message, onConfirm = null) {
    const modal = document.getElementById('system-modal');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const confirmBtn = document.getElementById('modal-confirm-btn');

    if (!modal) return;
    titleEl.innerText = title;
    bodyEl.innerText = message;

    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

    newBtn.addEventListener('click', () => {
      window.systemAudio.playClick();
      modal.classList.add('hidden');
      if (typeof onConfirm === 'function') onConfirm();
    });

    modal.classList.remove('hidden');
  }

  openShadowExtractionModal(dungeon) {
    const modal = document.getElementById('arise-modal');
    const bossNameEl = document.getElementById('arise-boss-name');
    const inputNameEl = document.getElementById('arise-shadow-name');
    const rankEl = document.getElementById('arise-shadow-rank');

    if (!modal) return;

    bossNameEl.innerText = dungeon.bossName;
    inputNameEl.value = dungeon.bossName;
    rankEl.innerText = window.ShadowManager.getShadowRankForDungeon(dungeon.rank);

    this._pendingExtractionDungeon = dungeon;
    modal.classList.remove('hidden');
  }

  // Render Controller
  render() {
    this.renderHeader();
    this.renderTabs();
    this.renderActiveTabContent();
  }

  renderHeader() {
    const rankInfo = window.HunterModels.getHunterRank(this.state.level);
    const reqXp = window.HunterModels.getXpRequired(this.state.level);
    const xpPercent = Math.min(100, Math.floor((this.state.currentXp / reqXp) * 100));

    const maxHp = window.HunterModels.calculateMaxHp(this.state.stats.vit);
    const hpPercent = Math.min(100, Math.max(0, Math.floor(((this.state.currentHp || maxHp) / maxHp) * 100)));

    const maxMp = window.HunterModels.calculateMaxMp(this.state.stats.int);
    const mpPercent = Math.min(100, Math.max(0, Math.floor(((this.state.currentMp || maxMp) / maxMp) * 100)));

    document.getElementById('hdr-player-name').innerText = this.state.name || 'Deepika Mamidipelly';
    document.getElementById('hdr-player-title').innerText = this.state.title || 'The Awakened';
    document.getElementById('hdr-player-level').innerText = `Lv. ${this.state.level}`;

    const currentClass = window.HunterModels.HUNTER_CLASSES.find(c => c.id === (this.state.job || 'none'));
    const classBadge = document.getElementById('hdr-player-class');
    if (classBadge && currentClass) {
      classBadge.innerText = `${currentClass.icon} ${currentClass.name}`;
    }

    const rankBadge = document.getElementById('hdr-player-rank');
    rankBadge.innerText = `${rankInfo.rank}-RANK`;
    rankBadge.style.borderColor = rankInfo.color;
    rankBadge.style.color = rankInfo.color;
    rankBadge.style.boxShadow = `0 0 12px ${rankInfo.glow}`;

    document.getElementById('hdr-gold-val').innerText = this.state.gold || 0;
    document.getElementById('hdr-crystals-val').innerText = this.state.crystals || 0;
    document.getElementById('hdr-streak-val').innerText = `${this.state.streak || 0}d`;

    // HP Bar
    document.getElementById('hp-bar-fill').style.width = `${hpPercent}%`;
    document.getElementById('hp-text').innerText = `${this.state.currentHp || maxHp} / ${maxHp}`;

    // MP Bar
    document.getElementById('mp-bar-fill').style.width = `${mpPercent}%`;
    document.getElementById('mp-text').innerText = `${this.state.currentMp || maxMp} / ${maxMp}`;

    // EXP Bar
    document.getElementById('xp-bar-fill').style.width = `${xpPercent}%`;
    document.getElementById('xp-text').innerText = `${this.state.currentXp} / ${reqXp} XP (${xpPercent}%)`;

    // Penalty Zone Visual Warnings
    const penaltyBanner = document.getElementById('penalty-zone-banner');
    const headerHud = document.querySelector('.system-header');

    if (this.state.penaltyEngaged) {
      if (penaltyBanner) penaltyBanner.classList.remove('hidden');
      if (headerHud) headerHud.classList.add('penalty-border-alert');
    } else {
      if (penaltyBanner) penaltyBanner.classList.add('hidden');
      if (headerHud) headerHud.classList.remove('penalty-border-alert');
    }
  }

  renderTabs() {
    const lockedTabs = ['dungeons', 'shop'];

    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      const tabName = tab.getAttribute('data-tab');

      // Enforce tab lockout during Penalty Zone
      if (this.state.penaltyEngaged && lockedTabs.includes(tabName)) {
        tab.classList.add('tab-locked');
        tab.setAttribute('title', '🚫 LOCKED: Complete Penalty Zone to unlock');
      } else {
        tab.classList.remove('tab-locked');
        tab.removeAttribute('title');
      }

      if (tabName === this.activeTab) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    const panels = document.querySelectorAll('.tab-panel');
    panels.forEach(p => {
      if (p.id === `tab-${this.activeTab}`) {
        p.classList.remove('hidden');
      } else {
        p.classList.add('hidden');
      }
    });
  }

  renderActiveTabContent() {
    switch (this.activeTab) {
      case 'status':
        this.renderStatusTab();
        break;
      case 'quests':
        this.renderQuestsTab();
        break;
      case 'dungeons':
        this.renderDungeonsTab();
        break;
      case 'shadows':
        this.renderShadowsTab();
        break;
      case 'shop':
        this.renderShopTab();
        break;
      case 'settings':
        this.renderSettingsTab();
        break;
    }
  }

  // STATUS TAB
  renderStatusTab() {
    const unallocatedEl = document.getElementById('unallocated-points-val');
    unallocatedEl.innerText = this.state.unallocatedPoints;
    const banner = document.getElementById('points-alert-banner');
    if (this.state.unallocatedPoints > 0) {
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }

    const statsContainer = document.getElementById('stats-list');
    statsContainer.innerHTML = '';

    Object.keys(window.HunterModels.STAT_DEFINITIONS).forEach(key => {
      const def = window.HunterModels.STAT_DEFINITIONS[key];
      const val = this.state.stats[key] || 10;

      const row = document.createElement('div');
      row.className = 'stat-row';
      row.innerHTML = `
        <div class="stat-info">
          <span class="stat-code" style="color: ${def.color}">${def.code}</span>
          <div class="stat-meta">
            <span class="stat-name">${def.name}</span>
            <span class="stat-desc">${def.desc}</span>
          </div>
        </div>
        <div class="stat-action">
          <span class="stat-value" id="val-${key}">${val}</span>
          ${this.state.unallocatedPoints > 0 ? `
            <button class="btn-allocate" data-stat="${key}" title="Allocate +1 point">+</button>
          ` : ''}
        </div>
      `;
      statsContainer.appendChild(row);
    });

    this.drawStatRadarChart();
    this.renderClassesList();
    this.renderTitlesList();
  }

  renderClassesList() {
    const container = document.getElementById('classes-list');
    if (!container) return;
    container.innerHTML = '';

    window.HunterModels.HUNTER_CLASSES.forEach(cls => {
      const isSelected = (this.state.job || 'none') === cls.id;
      const card = document.createElement('div');
      card.className = `class-card card-3d-tilt ${isSelected ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="class-header">
          <span class="class-icon">${cls.icon}</span>
          <span class="class-title">${cls.name}</span>
          ${isSelected ? '<span class="badge-equipped">ACTIVE CLASS</span>' : ''}
        </div>
        <div class="class-perk">${cls.perk}</div>
        ${!isSelected ? `
          <button class="btn-select-class" data-class="${cls.id}">Awaken Class</button>
        ` : ''}
      `;
      container.appendChild(card);
    });
  }

  drawStatRadarChart() {
    const canvas = document.getElementById('radar-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 36;

    ctx.clearRect(0, 0, width, height);

    const keys = ['str', 'agi', 'int', 'vit', 'per'];
    const totalAxes = keys.length;
    const angleSlice = (Math.PI * 2) / totalAxes;

    // Concentric web
    const rings = 4;
    for (let r = 1; r <= rings; r++) {
      ctx.beginPath();
      const currentRadius = (radius / rings) * r;
      for (let i = 0; i < totalAxes; i++) {
        const angle = i * angleSlice - Math.PI / 2;
        const x = centerX + Math.cos(angle) * currentRadius;
        const y = centerY + Math.sin(angle) * currentRadius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    keys.forEach((key, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.stroke();

      const def = window.HunterModels.STAT_DEFINITIONS[key];
      const labelX = centerX + Math.cos(angle) * (radius + 20);
      const labelY = centerY + Math.sin(angle) * (radius + 20);
      ctx.fillStyle = def.color;
      ctx.fillText(`${def.code} (${this.state.stats[key]})`, labelX, labelY);
    });

    const maxVal = Math.max(30, ...keys.map(k => this.state.stats[k]));

    ctx.beginPath();
    keys.forEach((key, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const statRatio = Math.min(1, this.state.stats[key] / maxVal);
      const statRadius = radius * statRatio;
      const x = centerX + Math.cos(angle) * statRadius;
      const y = centerY + Math.sin(angle) * statRadius;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();

    ctx.fillStyle = 'rgba(0, 240, 255, 0.28)';
    ctx.fill();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  renderTitlesList() {
    const container = document.getElementById('titles-list');
    if (!container) return;
    container.innerHTML = '';

    window.HunterModels.DEFAULT_TITLES.forEach(title => {
      const unlocked = (this.state.unlockedTitles || ['awakened']).includes(title.id);
      const isEquipped = this.state.title === title.name;

      const card = document.createElement('div');
      card.className = `title-card card-3d-tilt ${unlocked ? 'unlocked' : 'locked'} ${isEquipped ? 'equipped' : ''}`;
      card.innerHTML = `
        <div class="title-header">
          <span class="title-name">${title.name}</span>
          ${isEquipped ? '<span class="badge-equipped">EQUIPPED</span>' : ''}
          ${!unlocked ? '<span class="badge-locked">LOCKED</span>' : ''}
        </div>
        <div class="title-desc">${title.desc}</div>
        ${unlocked && !isEquipped ? `
          <button class="btn-equip-title" data-title="${title.name}">Equip Title</button>
        ` : ''}
      `;
      container.appendChild(card);
    });
  }

  // QUESTS TAB
  renderQuestsTab() {
    const regimenContainer = document.getElementById('regimen-items-container');
    if (regimenContainer) {
      regimenContainer.innerHTML = '';

      (this.state.dailyRegimen || []).forEach(item => {
        const percent = Math.min(100, Math.floor((item.current / item.target) * 100));
        const done = item.current >= item.target;

        const card = document.createElement('div');
        card.className = 'regimen-card card-3d-tilt';
        card.innerHTML = `
          <div class="regimen-top">
            <div class="regimen-title-wrap">
              <span class="regimen-icon">${item.icon || '💪'}</span>
              <span class="regimen-title ${done ? 'cleared' : ''}">${item.label}</span>
            </div>
            <div class="regimen-tools">
              <button class="btn-regimen-tool btn-edit-regimen" data-id="${item.id}" title="Edit Exercise">✏️</button>
              <button class="btn-regimen-tool btn-delete-regimen" data-id="${item.id}" title="Delete Exercise">✕</button>
            </div>
          </div>
          <div class="regimen-count">${item.current} / ${item.target} ${item.unit || 'reps'}</div>
          <div class="progress-bar-wrap">
            <div class="progress-fill ${done ? 'cleared-fill' : ''}" style="width: ${percent}%"></div>
          </div>
          <div class="regimen-actions">
            <button class="btn-step" data-id="${item.id}" data-delta="5">+5</button>
            <button class="btn-step" data-id="${item.id}" data-delta="10">+10</button>
            <button class="btn-step" data-id="${item.id}" data-delta="25">+25</button>
            <button class="btn-step btn-complete" data-id="${item.id}" data-delta="${item.target}">MAX</button>
          </div>
        `;
        regimenContainer.appendChild(card);
      });
    }

    // Custom Daily Quests
    const customContainer = document.getElementById('custom-quests-list');
    customContainer.innerHTML = '';

    if (!this.state.customQuests || this.state.customQuests.length === 0) {
      customContainer.innerHTML = `<div class="empty-state">No custom habit quests assigned yet. Accept new daily quests below!</div>`;
    } else {
      this.state.customQuests.forEach(quest => {
        const item = document.createElement('div');
        item.className = `quest-card card-3d-tilt ${quest.completed ? 'completed' : ''}`;
        item.innerHTML = `
          <div class="quest-checkbox-wrap">
            <input type="checkbox" class="quest-check" data-id="${quest.id}" ${quest.completed ? 'checked' : ''} />
          </div>
          <div class="quest-content">
            <div class="quest-title-row">
              <span class="quest-tag">${quest.category || 'Habit'}</span>
              <span class="quest-name ${quest.completed ? 'crossed' : ''}">${quest.title}</span>
            </div>
            <div class="quest-rewards-row">
              <span class="reward-pill">+${quest.xpReward} EXP</span>
              <span class="reward-pill gold">+${quest.goldReward} Gold</span>
              <span class="reward-pill stat">+${quest.statBonus || 1} ${(quest.stat || 'INT').toUpperCase()}</span>
            </div>
          </div>
          <div class="quest-actions-end">
            <button class="btn-edit-quest" data-id="${quest.id}" title="Edit quest">✏️</button>
            <button class="btn-delete-quest" data-id="${quest.id}" title="Abandon quest">✕</button>
          </div>
        `;
        customContainer.appendChild(item);
      });
    }
  }

  // DUNGEONS TAB
  renderDungeonsTab() {
    const list = document.getElementById('dungeons-list');
    list.innerHTML = '';

    if (!this.state.dungeons || this.state.dungeons.length === 0) {
      list.innerHTML = `<div class="empty-state">No active Dungeon Gates detected. Manifest a new Gate for your big goals or projects!</div>`;
      return;
    }

    const activeGate = this.state.dungeons.find(d => !d.completed) || this.state.dungeons[0];
    if (activeGate && this.scene3D) {
      this.scene3D.setGateRankColor(activeGate.rank);
      const gateTag = document.getElementById('gate-portal-rank-tag');
      if (gateTag) gateTag.innerText = `ACTIVE GATE: ${activeGate.rank}-RANK [${activeGate.title}]`;
    }

    this.state.dungeons.forEach(dungeon => {
      const card = document.createElement('div');
      card.className = `dungeon-card card-3d-tilt ${dungeon.completed ? 'cleared' : ''} rank-${dungeon.rank.toLowerCase()}`;

      const hpPercent = Math.max(0, Math.floor((dungeon.bossHpCurrent / dungeon.bossHpMax) * 100));

      let tasksHtml = '';
      dungeon.tasks.forEach(task => {
        tasksHtml += `
          <div class="dungeon-task-item ${task.completed ? 'done' : ''}">
            <input type="checkbox" class="task-check" data-dungeon="${dungeon.id}" data-task="${task.id}" ${task.completed ? 'checked' : ''} ${dungeon.completed ? 'disabled' : ''} />
            <span class="task-text">${task.text}</span>
            <span class="task-dmg">-${task.damage}% Boss HP</span>
          </div>
        `;
      });

      card.innerHTML = `
        <div class="dungeon-header">
          <div class="dungeon-rank-badge rank-${dungeon.rank.toLowerCase()}">${dungeon.rank}-RANK GATE</div>
          <div class="dungeon-header-tools">
            <button class="btn-manage-tasks" data-id="${dungeon.id}">⚙️ Manage Tasks</button>
            <button class="btn-delete-dungeon" data-id="${dungeon.id}" title="Close Gate">✕</button>
          </div>
        </div>
        <h3 class="dungeon-title">${dungeon.title}</h3>
        <p class="dungeon-desc">${dungeon.description}</p>
        
        <div class="boss-hud">
          <div class="boss-info">
            <span class="boss-name">BOSS: ${dungeon.bossName}</span>
            <span class="boss-hp-text">${dungeon.bossHpCurrent} / ${dungeon.bossHpMax} HP</span>
          </div>
          <div class="boss-hp-bar">
            <div class="boss-hp-fill" style="width: ${hpPercent}%"></div>
          </div>
        </div>

        <div class="dungeon-tasks-wrap">
          <div class="tasks-title">RAID OBJECTIVES:</div>
          ${tasksHtml}
        </div>

        <div class="dungeon-footer">
          <div class="dungeon-rewards">
            <span>REWARDS:</span>
            <span class="reward-pill">+${dungeon.xpReward} XP</span>
            <span class="reward-pill gold">+${dungeon.goldReward} Gold</span>
          </div>
          ${dungeon.completed && !dungeon.extracted ? `
            <button class="btn-arise-gate" data-id="${dungeon.id}">⚡ EXTRACT SHADOW ("ARISE")</button>
          ` : ''}
          ${dungeon.extracted ? `
            <span class="badge-extracted">✓ SHADOW EXTRACTED</span>
          ` : ''}
        </div>
      `;

      list.appendChild(card);
    });
  }

  // SHADOW ARMY TAB
  renderShadowsTab() {
    const container = document.getElementById('shadows-grid');
    container.innerHTML = '';

    const countEl = document.getElementById('shadow-count');
    if (countEl) countEl.innerText = (this.state.shadows || []).length;

    if (!this.state.shadows || this.state.shadows.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          The Shadow Realm is dormant.<br>Conquer Dungeon Gates and invoke "ARISE" to summon loyal shadows of your achievements.
        </div>
      `;
      return;
    }

    this.state.shadows.forEach(shadow => {
      const card = document.createElement('div');
      card.className = 'shadow-card card-3d-tilt';
      card.innerHTML = `
        <div class="shadow-flame-effect"></div>
        <div class="shadow-rank-tag">${shadow.rank}</div>
        <h3 class="shadow-name">${shadow.name}</h3>
        <div class="shadow-source">Conquered: ${shadow.sourceGate || 'Dungeon Gate'}</div>
        <div class="shadow-quote">"${shadow.phrase || 'My blade obeys the Monarch.'}"</div>
        <div class="shadow-footer">
          <span class="shadow-date">Extracted: ${shadow.extractedAt || 'Unknown'}</span>
          <button class="btn-dismiss-shadow" data-id="${shadow.id}" title="Release shadow">Release</button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // SHOP TAB
  renderShopTab() {
    const itemsContainer = document.getElementById('shop-items-grid');
    itemsContainer.innerHTML = '';

    (this.state.shopItems || []).forEach(item => {
      const card = document.createElement('div');
      card.className = 'shop-card card-3d-tilt';
      card.innerHTML = `
        <div class="shop-icon">${item.icon || '🎁'}</div>
        <div class="shop-name">${item.name}</div>
        <div class="shop-category">${item.category || 'Reward'}</div>
        <div class="shop-cost"><span class="gold-icon">🪙</span> ${item.cost} Gold</div>
        <button class="btn-buy-reward" data-id="${item.id}" ${this.state.gold < item.cost ? 'disabled' : ''}>
          ${this.state.gold < item.cost ? 'Need Gold' : 'Purchase'}
        </button>
        <button class="btn-delete-shop" data-id="${item.id}" title="Remove item">✕</button>
      `;
      itemsContainer.appendChild(card);
    });

    const invContainer = document.getElementById('inventory-list');
    invContainer.innerHTML = '';

    if (!this.state.inventory || this.state.inventory.length === 0) {
      invContainer.innerHTML = `<div class="empty-state">No purchased rewards in inventory. Treat yourself with earned gold!</div>`;
      return;
    }

    this.state.inventory.forEach(inv => {
      const row = document.createElement('div');
      row.className = `inventory-item card-3d-tilt ${inv.used ? 'used' : ''}`;
      row.innerHTML = `
        <div class="inv-left">
          <span class="inv-icon">${inv.icon}</span>
          <div class="inv-meta">
            <span class="inv-name ${inv.used ? 'crossed' : ''}">${inv.name}</span>
            <span class="inv-date">Acquired on ${inv.boughtAt}</span>
          </div>
        </div>
        <div class="inv-actions">
          ${!inv.used ? `
            <button class="btn-redeem" data-id="${inv.id}">Redeem Now</button>
          ` : `
            <span class="badge-redeemed">✓ CLAIMED</span>
          `}
          <button class="btn-remove-inv" data-id="${inv.id}" title="Remove">✕</button>
        </div>
      `;
      invContainer.appendChild(row);
    });
  }

  // SETTINGS TAB
  renderSettingsTab() {
    document.getElementById('profile-name-input').value = this.state.name || 'Deepika Mamidipelly';
    const soundToggle = document.getElementById('sound-toggle-btn');
    soundToggle.innerText = window.systemAudio.enabled ? 'Sound: ENABLED' : 'Sound: MUTED';
    soundToggle.className = window.systemAudio.enabled ? 'btn-action btn-cyan' : 'btn-action btn-muted';
  }

  // EVENT LISTENERS & MODALS
  initEventListeners() {
    // Nav Tabs with Penalty Zone Lockout
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = tab.getAttribute('data-tab');
        if (this.state.penaltyEngaged && (tabName === 'dungeons' || tabName === 'shop')) {
          window.systemAudio.playWarning();
          this.triggerScreenShake();
          this.showNotification("🚫 [ACCESS DENIED] Dungeons and Shop are LOCKED while in the Penalty Zone!");
          return;
        }

        window.systemAudio.playClick();
        this.activeTab = tabName;
        this.render();
      });
    });

    // Sound toggle in header
    const soundHeaderBtn = document.getElementById('btn-sound-toggle');
    if (soundHeaderBtn) {
      soundHeaderBtn.addEventListener('click', () => {
        const isEnabled = window.systemAudio.toggleSound();
        soundHeaderBtn.innerText = isEnabled ? '🔊 SOUND ON' : '🔇 MUTED';
        this.render();
      });
    }

    // PWA Install button in header
    const btnInstall = document.getElementById('btn-install-app');
    if (btnInstall) {
      btnInstall.addEventListener('click', async () => {
        if (this.deferredPrompt) {
          this.deferredPrompt.prompt();
          const { outcome } = await this.deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            btnInstall.classList.add('hidden');
          }
          this.deferredPrompt = null;
        } else {
          alert("To install on Mac: In Safari, click File > 'Add to Dock'. In Chrome, click the install icon in the address bar!");
        }
      });
    }

    // Test Level Up / Demo XP Boost in Settings
    const btnTestXp = document.getElementById('btn-test-xp');
    if (btnTestXp) {
      btnTestXp.addEventListener('click', (e) => {
        this.addXp(100, e);
      });
    }

    // Allocate Stat clicks
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-allocate')) {
        const stat = e.target.getAttribute('data-stat');
        this.allocateStat(stat, e);
      }
      if (e.target.classList.contains('btn-equip-title')) {
        const title = e.target.getAttribute('data-title');
        this.setActiveTitle(title);
      }
      if (e.target.classList.contains('btn-select-class')) {
        const clsId = e.target.getAttribute('data-class');
        this.setHunterClass(clsId);
      }
    });

    // Regimen step buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-step')) {
        const id = e.target.getAttribute('data-id');
        const delta = parseInt(e.target.getAttribute('data-delta')) || 5;
        this.quests.updateRegimenCount(id, delta, e);
      }
    });

    // Regimen Tools: Edit & Delete & Reset
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-edit-regimen')) {
        const id = e.target.getAttribute('data-id');
        this.openEditRegimenModal(id);
      }
      if (e.target.classList.contains('btn-delete-regimen')) {
        const id = e.target.getAttribute('data-id');
        if (confirm("Remove this conditioning exercise?")) {
          this.quests.deleteRegimenItem(id);
        }
      }
    });

    const btnAddRegimen = document.getElementById('btn-add-regimen');
    if (btnAddRegimen) {
      btnAddRegimen.addEventListener('click', () => {
        this.openEditRegimenModal(null);
      });
    }

    const btnResetRegimen = document.getElementById('btn-reset-regimen');
    if (btnResetRegimen) {
      btnResetRegimen.addEventListener('click', () => {
        if (confirm("Reset daily conditioning back to standard 4-part regimen?")) {
          this.quests.resetRegimenToDefault();
        }
      });
    }

    // Custom Quest Checkbox, Edit & Delete
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('quest-check')) {
        const id = e.target.getAttribute('data-id');
        this.quests.toggleCustomQuest(id, e);
      }
    });
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-edit-quest')) {
        const id = e.target.getAttribute('data-id');
        this.openEditQuestModal(id);
      }
      if (e.target.classList.contains('btn-delete-quest')) {
        const id = e.target.getAttribute('data-id');
        this.quests.deleteCustomQuest(id);
      }
    });

    // Dungeon Gate Task Checkbox & Actions
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('task-check')) {
        const dungeonId = e.target.getAttribute('data-dungeon');
        const taskId = e.target.getAttribute('data-task');
        this.dungeons.toggleDungeonTask(dungeonId, taskId, e);
      }
    });
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-delete-dungeon')) {
        const id = e.target.getAttribute('data-id');
        this.dungeons.deleteDungeon(id);
      }
      if (e.target.classList.contains('btn-arise-gate')) {
        const id = e.target.getAttribute('data-id');
        const dungeon = this.state.dungeons.find(d => d.id === id);
        if (dungeon) this.openShadowExtractionModal(dungeon);
      }
      if (e.target.classList.contains('btn-manage-tasks')) {
        const id = e.target.getAttribute('data-id');
        this.openManageGateModal(id);
      }
    });

    // Shadow Army Release
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-dismiss-shadow')) {
        const id = e.target.getAttribute('data-id');
        this.shadows.dismissShadow(id);
      }
    });

    // Shop Actions
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-buy-reward')) {
        const id = e.target.getAttribute('data-id');
        this.shop.buyItem(id);
      }
      if (e.target.classList.contains('btn-redeem')) {
        const id = e.target.getAttribute('data-id');
        this.shop.redeemItem(id);
      }
      if (e.target.classList.contains('btn-remove-inv')) {
        const id = e.target.getAttribute('data-id');
        this.shop.removeInventoryItem(id);
      }
      if (e.target.classList.contains('btn-delete-shop')) {
        const id = e.target.getAttribute('data-id');
        this.shop.deleteShopItem(id);
      }
    });

    // Add Custom Quest Modal
    const btnOpenAddQuest = document.getElementById('btn-open-add-quest');
    const modalAddQuest = document.getElementById('add-quest-modal');
    const btnCloseAddQuest = document.getElementById('btn-close-add-quest');
    const formAddQuest = document.getElementById('form-add-quest');

    if (btnOpenAddQuest) {
      btnOpenAddQuest.addEventListener('click', () => {
        window.systemAudio.playClick();
        modalAddQuest.classList.remove('hidden');
      });
    }
    if (btnCloseAddQuest) {
      btnCloseAddQuest.addEventListener('click', () => {
        modalAddQuest.classList.add('hidden');
      });
    }
    if (formAddQuest) {
      formAddQuest.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('quest-input-title').value;
        const stat = document.getElementById('quest-select-stat').value;
        const category = document.getElementById('quest-input-category').value;
        const xp = document.getElementById('quest-input-xp').value;
        const gold = document.getElementById('quest-input-gold').value;
        this.quests.addCustomQuest(title, stat, 1, xp, gold, category);
        formAddQuest.reset();
        modalAddQuest.classList.add('hidden');
      });
    }

    // Add Dungeon Gate Modal
    const btnOpenAddDungeon = document.getElementById('btn-open-add-dungeon');
    const modalAddDungeon = document.getElementById('add-dungeon-modal');
    const btnCloseAddDungeon = document.getElementById('btn-close-add-dungeon');
    const formAddDungeon = document.getElementById('form-add-dungeon');

    if (btnOpenAddDungeon) {
      btnOpenAddDungeon.addEventListener('click', () => {
        window.systemAudio.playClick();
        modalAddDungeon.classList.remove('hidden');
      });
    }
    if (btnCloseAddDungeon) {
      btnCloseAddDungeon.addEventListener('click', () => {
        modalAddDungeon.classList.add('hidden');
      });
    }
    if (formAddDungeon) {
      formAddDungeon.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('dungeon-input-title').value;
        const rank = document.getElementById('dungeon-select-rank').value;
        const desc = document.getElementById('dungeon-input-desc').value;
        const tasksRaw = document.getElementById('dungeon-input-tasks').value;
        const tasks = tasksRaw.split('\n').map(t => t.trim()).filter(t => t.length > 0);

        if (tasks.length === 0) {
          alert("Please enter at least 1 milestone task!");
          return;
        }

        this.dungeons.createDungeon(title, rank, desc, tasks);
        formAddDungeon.reset();
        modalAddDungeon.classList.add('hidden');
      });
    }

    // Arise Modal
    const modalArise = document.getElementById('arise-modal');
    const btnConfirmArise = document.getElementById('btn-confirm-arise');
    const btnCancelArise = document.getElementById('btn-cancel-arise');

    if (btnConfirmArise) {
      btnConfirmArise.addEventListener('click', () => {
        if (this._pendingExtractionDungeon) {
          const shadowName = document.getElementById('arise-shadow-name').value;
          this.shadows.extractShadow(this._pendingExtractionDungeon, shadowName);
          this._pendingExtractionDungeon = null;
        }
        modalArise.classList.add('hidden');
      });
    }
    if (btnCancelArise) {
      btnCancelArise.addEventListener('click', () => {
        this._pendingExtractionDungeon = null;
        modalArise.classList.add('hidden');
      });
    }

    // Add Shop Item Modal
    const btnOpenAddShop = document.getElementById('btn-open-add-shop');
    const modalAddShop = document.getElementById('add-shop-modal');
    const btnCloseAddShop = document.getElementById('btn-close-add-shop');
    const formAddShop = document.getElementById('form-add-shop');

    if (btnOpenAddShop) {
      btnOpenAddShop.addEventListener('click', () => {
        window.systemAudio.playClick();
        modalAddShop.classList.remove('hidden');
      });
    }
    if (btnCloseAddShop) {
      btnCloseAddShop.addEventListener('click', () => {
        modalAddShop.classList.add('hidden');
      });
    }
    if (formAddShop) {
      formAddShop.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('shop-input-name').value;
        const cost = document.getElementById('shop-input-cost').value;
        const icon = document.getElementById('shop-input-icon').value;
        const cat = document.getElementById('shop-input-cat').value;

        this.shop.addNewShopItem(name, cost, icon, cat);
        formAddShop.reset();
        modalAddShop.classList.add('hidden');
      });
    }

    // Penalty Survival Claim
    const btnResolvePenalty = document.getElementById('btn-resolve-penalty');
    if (btnResolvePenalty) {
      btnResolvePenalty.addEventListener('click', () => {
        this.quests.resolvePenaltyZone();
      });
    }

    // Settings actions
    const btnSaveName = document.getElementById('btn-save-name');
    if (btnSaveName) {
      btnSaveName.addEventListener('click', () => {
        const val = document.getElementById('profile-name-input').value.trim();
        if (val) {
          this.state.name = val;
          window.systemAudio.playClick();
          this.showNotification(`[IDENTITY UPDATED] Hunter: ${val}`);
          this.persistAndRender();
        }
      });
    }

    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    if (soundToggleBtn) {
      soundToggleBtn.addEventListener('click', () => {
        window.systemAudio.toggleSound();
        this.render();
      });
    }

    const btnExport = document.getElementById('btn-export-backup');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        window.StorageManager.exportBackup(this.state);
        window.systemAudio.playClick();
      });
    }

    const btnImport = document.getElementById('btn-import-backup');
    const fileInput = document.getElementById('import-file-input');
    if (btnImport && fileInput) {
      btnImport.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          const res = window.StorageManager.importBackup(event.target.result);
          if (res.success) {
            this.state = res.state;
            window.systemAudio.playGateClear();
            this.showNotification("[BACKUP RESTORED] Hunter data loaded!");
            this.persistAndRender();
          } else {
            alert("Failed to load backup: " + res.error);
          }
        };
        reader.readAsText(file);
      });
    }

    const btnReset = document.getElementById('btn-reset-system');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm("WARNING: Reset all progress back to Level 1 E-Rank? This cannot be undone.")) {
          this.state = window.StorageManager.resetToDefault();
          window.systemAudio.playWarning();
          this.render();
        }
      });
    }

    const btnTestPenalty = document.getElementById('btn-test-penalty');
    if (btnTestPenalty) {
      btnTestPenalty.addEventListener('click', () => {
        this.quests.triggerManualPenaltyTest();
      });
    }
  }

  // MODAL HANDLERS
  openEditRegimenModal(regimenId) {
    const modal = document.getElementById('edit-regimen-modal');
    const titleEl = document.getElementById('regimen-modal-title');
    const idInput = document.getElementById('regimen-edit-id');
    const labelInput = document.getElementById('regimen-input-label');
    const targetInput = document.getElementById('regimen-input-target');
    const unitInput = document.getElementById('regimen-input-unit');
    const iconInput = document.getElementById('regimen-input-icon');
    const statSelect = document.getElementById('regimen-select-stat');

    if (!modal) return;

    if (regimenId) {
      const item = this.state.dailyRegimen.find(r => r.id === regimenId);
      if (!item) return;
      titleEl.innerText = "⚙️ EDIT CONDITIONING EXERCISE";
      idInput.value = item.id;
      labelInput.value = item.label;
      targetInput.value = item.target;
      unitInput.value = item.unit || 'reps';
      iconInput.value = item.icon || '💪';
      statSelect.value = item.stat || 'str';
    } else {
      titleEl.innerText = "➕ ADD CONDITIONING EXERCISE";
      idInput.value = '';
      labelInput.value = '';
      targetInput.value = '50';
      unitInput.value = 'reps';
      iconInput.value = '⚡';
      statSelect.value = 'str';
    }

    modal.classList.remove('hidden');

    const form = document.getElementById('form-edit-regimen');
    form.onsubmit = (e) => {
      e.preventDefault();
      if (idInput.value) {
        this.quests.editRegimenItem(idInput.value, labelInput.value, targetInput.value, unitInput.value, iconInput.value, statSelect.value);
      } else {
        this.quests.addRegimenItem(labelInput.value, targetInput.value, unitInput.value, iconInput.value, statSelect.value);
      }
      modal.classList.add('hidden');
    };

    document.getElementById('btn-close-edit-regimen').onclick = () => modal.classList.add('hidden');
  }

  openEditQuestModal(questId) {
    const quest = this.state.customQuests.find(q => q.id === questId);
    if (!quest) return;

    const modal = document.getElementById('edit-quest-modal');
    document.getElementById('quest-edit-id').value = quest.id;
    document.getElementById('quest-edit-title').value = quest.title;
    document.getElementById('quest-edit-stat').value = quest.stat || 'int';
    document.getElementById('quest-edit-category').value = quest.category || 'General';
    document.getElementById('quest-edit-xp').value = quest.xpReward || 35;
    document.getElementById('quest-edit-gold').value = quest.goldReward || 20;

    modal.classList.remove('hidden');

    const form = document.getElementById('form-edit-quest');
    form.onsubmit = (e) => {
      e.preventDefault();
      const title = document.getElementById('quest-edit-title').value;
      const stat = document.getElementById('quest-edit-stat').value;
      const cat = document.getElementById('quest-edit-category').value;
      const xp = document.getElementById('quest-edit-xp').value;
      const gold = document.getElementById('quest-edit-gold').value;
      this.quests.editCustomQuest(quest.id, title, stat, 1, xp, gold, cat);
      modal.classList.add('hidden');
    };

    document.getElementById('btn-close-edit-quest').onclick = () => modal.classList.add('hidden');
  }

  openManageGateModal(dungeonId) {
    const dungeon = this.state.dungeons.find(d => d.id === dungeonId);
    if (!dungeon) return;

    const modal = document.getElementById('manage-gate-modal');
    document.getElementById('manage-gate-title').innerText = `MANAGE OBJECTIVES: [${dungeon.title}]`;
    const tasksListContainer = document.getElementById('manage-gate-tasks-list');

    const renderManageTasks = () => {
      tasksListContainer.innerHTML = '';
      dungeon.tasks.forEach(t => {
        const row = document.createElement('div');
        row.className = 'dungeon-task-item';
        row.innerHTML = `
          <input type="text" class="form-input manage-task-text" data-id="${t.id}" value="${t.text}" style="flex:1;" />
          <span class="task-dmg">-${t.damage}% HP</span>
          <button class="btn-delete-quest btn-delete-gate-task" data-id="${t.id}" title="Remove task">✕</button>
        `;
        tasksListContainer.appendChild(row);
      });
    };

    renderManageTasks();

    modal.classList.remove('hidden');

    const btnAddTask = document.getElementById('btn-add-milestone-task');
    const inputNewTask = document.getElementById('input-new-milestone-task');
    btnAddTask.onclick = () => {
      if (inputNewTask.value.trim()) {
        this.dungeons.addTaskToDungeon(dungeon.id, inputNewTask.value);
        inputNewTask.value = '';
        renderManageTasks();
      }
    };

    tasksListContainer.onclick = (e) => {
      if (e.target.classList.contains('btn-delete-gate-task')) {
        const taskId = e.target.getAttribute('data-id');
        this.dungeons.deleteDungeonTask(dungeon.id, taskId);
        renderManageTasks();
      }
    };

    tasksListContainer.onchange = (e) => {
      if (e.target.classList.contains('manage-task-text')) {
        const taskId = e.target.getAttribute('data-id');
        this.dungeons.editDungeonTask(dungeon.id, taskId, e.target.value);
      }
    };

    document.getElementById('btn-close-manage-gate').onclick = () => {
      modal.classList.add('hidden');
      this.render();
    };
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.soloApp = new SoloLevelingApp();
});
