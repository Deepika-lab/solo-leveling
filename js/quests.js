/**
 * quests.js - Daily Quests, Configurable Physical Regimen, and Penalty Zone logic
 */

class QuestManager {
  constructor(app) {
    this.app = app;
  }

  get state() {
    return this.app.state;
  }

  // Update counter for a regimen item
  updateRegimenCount(regimenId, delta, event = null) {
    if (!Array.isArray(this.state.dailyRegimen)) return;
    const reg = this.state.dailyRegimen.find(r => r.id === regimenId);
    if (!reg) return;

    const previousVal = reg.current;
    reg.current = Math.max(0, Math.min(reg.target * 3, reg.current + delta));

    // Show floating combat text if event provided
    if (event) {
      const rect = event.target.getBoundingClientRect();
      const txt = delta > 0 ? `+${delta} ${reg.unit || 'reps'}` : `${delta}`;
      this.app.showFloatingCombatText(rect.left + 20, rect.top - 10, txt, 'stat');
    }

    if (previousVal < reg.target && reg.current >= reg.target) {
      window.systemAudio.playQuestComplete();
      this.app.showNotification(`TARGET REACHED: ${reg.label} [${reg.target}/${reg.target}] COMPLETE!`);
      // Award stat point boost
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
      window.systemAudio.playLevelUp();
      this.app.triggerScreenShake();
      this.app.showModalNotification(
        "QUEST COMPLETED: [DAILY QUEST: PREPARATION TO BECOME STRONG]",
        "All conditioning regimens cleared!\n\nREWARDS GRANTED:\n• +120 EXP\n• +60 Hunter Gold\n• Full HP/MP Recovery\n• Stat Growth Surge",
        () => {
          this.state.currentXp += 120;
          this.state.gold += 60;
          this.app.healToFull();
          this.app.checkLevelUp();
          this.app.persistAndRender();
        }
      );
    }
  }

  // CONFIGURABLE REGIMEN MANAGEMENT
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

  // CUSTOM DAILY QUESTS
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

  // PENALTY ZONE
  resolvePenaltyZone() {
    this.state.penaltyEngaged = false;
    this.app.healToFull();
    window.systemAudio.playGateClear();
    this.app.triggerScreenShake();
    this.app.showModalNotification(
      "PENALTY ZONE SURVIVED",
      "You have persevered through the emergency survival punishment!\n\nSystem penalties lifted. All HP & MP restored.\nTitle progress updated: 'One Who Overcame Adversity'."
    );
    this.app.unlockTitle('iron_will');
    this.app.persistAndRender();
  }

  triggerManualPenaltyTest() {
    this.state.penaltyEngaged = true;
    window.systemAudio.playWarning();
    this.app.triggerScreenShake();
    const maxHp = window.HunterModels.calculateMaxHp(this.state.stats.vit);
    this.state.currentHp = Math.max(15, Math.floor(maxHp * 0.3));
    this.app.showModalNotification(
      "[WARNING: PENALTY QUEST TRIGGERED]",
      "YOU HAVE ENTERED THE PENALTY ZONE!\n\nSurvival Quest: Complete 15 minutes of emergency training to escape."
    );
    this.app.persistAndRender();
  }
}

window.QuestManager = QuestManager;
