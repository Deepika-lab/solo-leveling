/**
 * storage.js - LocalStorage Persistence, Day Rollover & Data Backup (Export/Import)
 */

const STORAGE_KEY = 'solo_leveling_system_save_v1';

class StorageManager {
  static getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  static loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = window.HunterModels.getDefaultPlayerState();
        this.saveState(initial);
        return initial;
      }
      let data = JSON.parse(raw);
      data = this.migrateState(data);
      return this.checkDayRollover(data);
    } catch (e) {
      console.error("Failed to parse saved state, creating fresh profile:", e);
      const fallback = window.HunterModels.getDefaultPlayerState();
      this.saveState(fallback);
      return fallback;
    }
  }

  // Schema migration for configurable daily regimen
  static migrateState(state) {
    if (!state.dailyRegimen || !Array.isArray(state.dailyRegimen)) {
      const old = state.dailyRegimen || {};
      state.dailyRegimen = [
        { id: 'reg_pushups', label: 'Push-ups', current: old.pushups ? old.pushups.current : 0, target: old.pushups ? old.pushups.target : 100, unit: 'reps', icon: '💪', stat: 'str' },
        { id: 'reg_situps', label: 'Sit-ups', current: old.situps ? old.situps.current : 0, target: old.situps ? old.situps.target : 100, unit: 'reps', icon: '🧘', stat: 'str' },
        { id: 'reg_squats', label: 'Squats', current: old.squats ? old.squats.current : 0, target: old.squats ? old.squats.target : 100, unit: 'reps', icon: '🦵', stat: 'str' },
        { id: 'reg_running', label: 'Running', current: old.running ? old.running.current : 0, target: old.running ? old.running.target : 10, unit: 'km', icon: '🏃', stat: 'agi' }
      ];
    }
    return state;
  }

  static saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
    }
  }

  static checkDayRollover(state) {
    const today = this.getTodayString();
    if (!state.lastActiveDate) {
      state.lastActiveDate = today;
      return state;
    }

    if (state.lastActiveDate !== today) {
      const regimenDone = Array.isArray(state.dailyRegimen) && state.dailyRegimen.every(r => r.current >= r.target);
      const customDone = (state.customQuests || []).every(q => q.completed);

      const allCleared = regimenDone && customDone;

      if (allCleared) {
        state.streak = (state.streak || 0) + 1;
        state.penaltyEngaged = false;
        state.currentXp += 50;
      } else {
        state.penaltyEngaged = true;
        state.streak = 0;
        const maxHp = window.HunterModels.calculateMaxHp(state.stats.vit);
        state.currentHp = Math.max(10, Math.floor((state.currentHp || maxHp) - (maxHp * 0.2)));
      }

      // Reset daily regimen
      if (Array.isArray(state.dailyRegimen)) {
        state.dailyRegimen.forEach(r => r.current = 0);
      }

      // Reset custom daily quests
      if (state.customQuests) {
        state.customQuests.forEach(q => q.completed = false);
      }

      state.lastActiveDate = today;
      this.saveState(state);
    }

    return state;
  }

  static exportBackup(state) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `solo_leveling_hunter_${state.name}_Lv${state.level}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  static importBackup(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.stats || typeof parsed.level !== 'number') {
        throw new Error("Invalid Solo Leveling save file schema");
      }
      const migrated = this.migrateState(parsed);
      this.saveState(migrated);
      return { success: true, state: migrated };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  static resetToDefault() {
    const fresh = window.HunterModels.getDefaultPlayerState();
    this.saveState(fresh);
    return fresh;
  }
}

window.StorageManager = StorageManager;
