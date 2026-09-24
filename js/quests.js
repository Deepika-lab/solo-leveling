/**
 * quests.js - Daily Quests, Configurable Physical Regimen, Countdown Timer & Penalty System
 */

class QuestManager {
  constructor(app) {
    this.app = app;
    this.startCountdownLoop();
  }

  get state() {
    return this.app.state;
  }

  // Live Countdown until Midnight (Daily Quest Expiration)
  startCountdownLoop() {
    setInterval(() => {
      this.updateCountdownDisplay();
    }, 1000);
  }

  getDailyCountdown() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); // Next midnight

    const diffMs = midnight - now;
    if (diffMs <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, formatted: '00:00:00', expired: true };
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, '0');
    return {
      hours,
      minutes,
      seconds,
      formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
      expired: false
    };
  }

  updateCountdownDisplay() {
    const timerEl = document.getElementById('daily-countdown-timer');
    const tabTimerEl = document.getElementById('quest-tab-countdown');
    const countdown = this.getDailyCountdown();
    const color = countdown.hours < 2 ? '#ef4444' : 'var(--cyan)';

    if (timerEl) {
      timerEl.innerText = countdown.formatted;
      timerEl.style.color = color;
    }

    if (tabTimerEl) {
      tabTimerEl.innerText = countdown.formatted;
      tabTimerEl.style.color = color;
    }

    // If midnight struck and dailies are not done, engage penalty immediately
    if (countdown.expired && !this.state.penaltyEngaged && !this.isRegimenFullyComplete()) {
      this.triggerMidnightPenalty();
    }
  }

  triggerMidnightPenalty() {
    this.state.penaltyEngaged = true;
    this.state.streak = 0;
    const maxHp = window.HunterModels.calculateMaxHp(this.state.stats.vit);
    this.state.currentHp = Math.max(5, Math.floor(maxHp * 0.1));
    this.state.currentXp = Math.max(0, this.state.currentXp - 50);

    window.systemAudio.playWarning();
    this.app.triggerScreenShake();
    this.app.showModalNotification(
      "⚠️ [PENALTY QUEST: DESERT OF CENTIPEDES]",
      "YOU FAILED TO COMPLETE THE DAILY QUEST WITHIN 24 HOURS!\n\nCONSEQUENCES ENFORCED:\n• Transported to the Penalty Zone\n• Daily streak reset to 0\n• HP reduced to 10% (Critical Danger)\n• Dungeons, Shop, and Rewards LOCKED\n\nComplete the Emergency Survival Task to escape!"
    );
    this.app.persistAndRender();
  }

  // Update counter for a regimen item
  updateRegimenCount(regimenId, delta, event = null) {
    if (!Array.isArray(this.state.dailyRegimen)) return;
    const reg = this.state.dailyRegimen.find(r => r.id === regimenId);
    if (!reg) return;

    const previousVal = reg.current;
    reg.current = Math.max(0, Math.min(reg.target * 3, reg.current + delta));

    if (event) {
      const rect = event.target.getBoundingClientRect();
      const txt = delta > 0 ? `+${delta} ${reg.unit || 'reps'}` : `${delta}`;
      this.app.showFloatingCombatText(rect.left + 20, rect.top - 10, txt, 'stat');
    }

    if (previousVal < reg.target && reg.current >= reg.target) {
      window.systemAudio.playQuestComplete();
      this.app.showNotification(`TARGET REACHED: ${reg.label} [${reg.target}/${reg.target}] COMPLETE!`);
      if (reg.stat && this.state.stats[reg.stat] !== undefined) {
        this.state.stats[reg.stat] += 1;
        this.app.showNotification(`STAT UP: +1 ${reg.stat.toUpperCase()}!`);
      }
    } else {
      window.systemAudio.playClick();
    }

    this.checkEntireRegimenCompletion();
    this.app.persistAndRender();
  }

  setRegimenCount(regimenId, exactVal) {
    if (!Array.isArray(this.state.dailyRegimen)) return;
    const reg = this.state.dailyRegimen.find(r => r.id === regimenId);
    if (!reg) return;

    const previousVal = reg.current;
    reg.current = Math.max(0, parseInt(exactVal) || 0);

    if (previousVal < reg.target && reg.current >= reg.target) {
      window.systemAudio.playQuestComplete();
      this.app.showNotification(`TARGET REACHED: ${reg.label} [${reg.target}/${reg.target}] COMPLETE!`);
    }

    this.checkEntireRegimenCompletion();
    this.app.persistAndRender();
  }

  isRegimenFullyComplete() {
    if (!Array.isArray(this.state.dailyRegimen) || this.state.dailyRegimen.length === 0) return false;
    return this.state.dailyRegimen.every(r => r.current >= r.target);
  }

  checkEntireRegimenCompletion() {
    if (!this.state.regimenClearedToday && this.isRegimenFullyComplete()) {
      this.state.regimenClearedToday = true;
      this.state.currentXp += 120;
      this.state.gold += 60;
      this.app.healToFull();
      this.app.checkLevelUp();

      // Record cleared date in consistency history
      const today = typeof StorageManager !== 'undefined' ? StorageManager.getTodayString() : new Date().toISOString().split('T')[0];
      this.state.history = this.state.history || {};
      this.state.history[today] = { cleared: true, date: today };

      // Trigger the Blessed Random Box Ceremony!
      this.app.openBlessedLootbox();
      this.app.persistAndRender();
    }
  }

  // Configurable Regimen
  addRegimenItem(label, target, unit, icon, stat) {
    const newItem = {
      id: 'reg_' + Date.now(),
      label: label.trim() || 'Exercise',
      current: 0,
      target: Math.max(1, parseInt(target) || 50),
      unit: (unit || 'reps').trim(),
      icon: (icon || '💪').trim(),
      stat: stat || 'str'
    };
    this.state.dailyRegimen.push(newItem);
    window.systemAudio.playClick();
    this.app.showNotification(`[REGIMEN EXPANDED] "${newItem.label}" added to conditioning.`);
    this.app.persistAndRender();
  }

  editRegimenItem(id, label, target, unit, icon, stat) {
    const item = this.state.dailyRegimen.find(r => r.id === id);
    if (!item) return;

    item.label = label.trim() || item.label;
    item.target = Math.max(1, parseInt(target) || item.target);
    item.unit = (unit || item.unit).trim();
    item.icon = (icon || item.icon).trim();
    item.stat = stat || item.stat;

    window.systemAudio.playClick();
    this.app.showNotification(`[REGIMEN MODIFIED] "${item.label}" updated.`);
    this.app.persistAndRender();
  }

  deleteRegimenItem(id) {
    if (this.state.dailyRegimen.length <= 1) {
      alert("You must keep at least 1 exercise in your conditioning regimen!");
      return;
    }
    this.state.dailyRegimen = this.state.dailyRegimen.filter(r => r.id !== id);
    window.systemAudio.playClick();
    this.app.showNotification(`[REGIMEN REMOVED] Exercise removed.`);
    this.app.persistAndRender();
  }

  resetRegimenToDefault() {
    this.state.dailyRegimen = JSON.parse(JSON.stringify(window.HunterModels.DEFAULT_REGIMEN));
    window.systemAudio.playClick();
    this.app.showNotification(`[REGIMEN RESTORED] Default 4-part conditioning restored.`);
    this.app.persistAndRender();
  }

  // Custom Daily Quests
  toggleCustomQuest(questId, event = null) {
    const quest = this.state.customQuests.find(q => q.id === questId);
    if (!quest) return;

    quest.completed = !quest.completed;

    if (quest.completed) {
      window.systemAudio.playQuestComplete();
      this.app.addXp(quest.xpReward || 30);
      this.state.gold += (quest.goldReward || 15);

      if (event) {
        const rect = event.target.getBoundingClientRect();
        this.app.showFloatingCombatText(rect.left + 20, rect.top - 10, `+${quest.xpReward} EXP!`, 'xp');
      }

      if (quest.stat && this.state.stats[quest.stat] !== undefined) {
        this.state.stats[quest.stat] += (quest.statBonus || 1);
        this.app.showNotification(`QUEST COMPLETE: ${quest.title} (+${quest.xpReward} XP, +${quest.statBonus || 1} ${quest.stat.toUpperCase()})`);
      } else {
        this.app.showNotification(`QUEST COMPLETE: ${quest.title} (+${quest.xpReward} XP, +${quest.goldReward} Gold)`);
      }
    } else {
      this.state.currentXp = Math.max(0, this.state.currentXp - (quest.xpReward || 30));
      this.state.gold = Math.max(0, this.state.gold - (quest.goldReward || 15));
      if (quest.stat && this.state.stats[quest.stat] !== undefined) {
        this.state.stats[quest.stat] = Math.max(1, this.state.stats[quest.stat] - (quest.statBonus || 1));
      }
      window.systemAudio.playClick();
    }

    this.app.persistAndRender();
  }

  addCustomQuest(title, stat, statBonus, xpReward, goldReward, category) {
    const newQuest = {
      id: 'quest_' + Date.now(),
      title: title.trim(),
      stat: stat || 'int',
      statBonus: parseInt(statBonus) || 1,
      xpReward: parseInt(xpReward) || 35,
      goldReward: parseInt(goldReward) || 20,
      completed: false,
      category: category || 'General'
    };

    this.state.customQuests.push(newQuest);
    window.systemAudio.playClick();
    this.app.showNotification(`NEW QUEST ACCEPTED: [${newQuest.title}]`);
    this.app.persistAndRender();
  }

  editCustomQuest(id, title, stat, statBonus, xpReward, goldReward, category) {
    const quest = this.state.customQuests.find(q => q.id === id);
    if (!quest) return;

    quest.title = title.trim();
    quest.stat = stat;
    quest.statBonus = parseInt(statBonus) || 1;
    quest.xpReward = parseInt(xpReward) || 35;
    quest.goldReward = parseInt(goldReward) || 20;
    quest.category = category.trim() || 'General';

    window.systemAudio.playClick();
    this.app.showNotification(`[QUEST UPDATED] "${quest.title}" modified.`);
    this.app.persistAndRender();
  }

  deleteCustomQuest(questId) {
    this.state.customQuests = this.state.customQuests.filter(q => q.id !== questId);
    window.systemAudio.playClick();
    this.app.persistAndRender();
  }

  // Escape Penalty Zone by completing punishment
  resolvePenaltyZone() {
    this.state.penaltyEngaged = false;
    this.app.healToFull();
    window.systemAudio.playGateClear();
    this.app.triggerScreenShake();
    this.app.showModalNotification(
      "PENALTY ZONE SURVIVED",
      "You survived the Desert of Centipedes!\n\n• System sanctions lifted\n• All HP & MP restored to 100%\n• Dungeons & Shop unlocked\n• Title progress: 'One Who Overcame Adversity'"
    );
    this.app.unlockTitle('iron_will');
    this.app.persistAndRender();
  }

  triggerManualPenaltyTest() {
    this.state.penaltyEngaged = true;
    this.state.streak = 0;
    window.systemAudio.playWarning();
    this.app.triggerScreenShake();
    const maxHp = window.HunterModels.calculateMaxHp(this.state.stats.vit);
    this.state.currentHp = Math.max(10, Math.floor(maxHp * 0.1));
    this.state.currentXp = Math.max(0, this.state.currentXp - 50);

    this.app.showModalNotification(
      "⚠️ [PENALTY QUEST: DESERT OF CENTIPEDES]",
      "PENALTY ZONE ENGAGED!\n\nPUNISHMENT ACTIVE:\n• HP dropped to 10% (Critical Danger)\n• Daily streak reset to 0\n• Dungeons, Shop, and Rewards LOCKED\n\nComplete the Emergency Survival Task to escape!"
    );
    this.app.persistAndRender();
  }
}

window.QuestManager = QuestManager;
