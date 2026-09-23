/**
 * dungeons.js - Dungeon Gates, Boss Raids, Milestone Tracking & Boss HP
 */

class DungeonManager {
  constructor(app) {
    this.app = app;
  }

  get state() {
    return this.app.state;
  }

  static getRandomBossName(rank) {
    const bossesByRank = {
      'E': ['Goblin Chieftain', 'Giant Swamp Centipede', 'Razor-Claw Wolf Pack'],
      'D': ['Steel Fang Raikan', 'Blue-Venom Kasaka', 'Dungeon Hobgoblin'],
      'C': ['Shadow Cerberus', 'Ice Bear Alpha', 'Poisonous Giant Arachnid'],
      'B': ['Blood-Red Commander Igris', 'High Orc Warrior Kargalgan', 'Naga General'],
      'A': ['White Walker Chieftain Baruka', 'Demon Noble Vulkan', 'Arch Lich Metus'],
      'S': ['Demon King Baran', 'Ant King Beru', 'Dragon Sovereign Kamish']
    };
    const list = bossesByRank[rank] || bossesByRank['D'];
    return list[Math.floor(Math.random() * list.length)];
  }

  static getRankRewards(rank) {
    const table = {
      'E': { xp: 120, gold: 60 },
      'D': { xp: 250, gold: 140 },
      'C': { xp: 550, gold: 320 },
      'B': { xp: 1100, gold: 700 },
      'A': { xp: 2500, gold: 1600 },
      'S': { xp: 6000, gold: 4000 }
    };
    return table[rank] || table['D'];
  }

  recalculateTaskDamages(dungeon) {
    const taskCount = Math.max(1, dungeon.tasks.length);
    const damagePerTask = Math.floor(100 / taskCount);
    const remainder = 100 - (damagePerTask * taskCount);

    dungeon.tasks.forEach((t, idx) => {
      t.damage = damagePerTask + (idx === 0 ? remainder : 0);
    });

    let remainingHp = 100;
    dungeon.tasks.forEach(t => {
      if (t.completed) remainingHp -= t.damage;
    });
    dungeon.bossHpCurrent = Math.max(0, remainingHp);
  }

  createDungeon(title, rank, description, tasks) {
    const rewards = DungeonManager.getRankRewards(rank);
    const bossName = DungeonManager.getRandomBossName(rank);

    const taskCount = Math.max(1, tasks.length);
    const damagePerTask = Math.floor(100 / taskCount);
    let remainder = 100 - (damagePerTask * taskCount);

    const formattedTasks = tasks.map((t, idx) => {
      const dmg = damagePerTask + (idx === 0 ? remainder : 0);
      return {
        id: 'task_' + Date.now() + '_' + idx,
        text: t.trim(),
        completed: false,
        damage: dmg
      };
    });

    const newDungeon = {
      id: 'dungeon_' + Date.now(),
      title: title.trim(),
      rank: rank,
      description: description.trim() || 'A spatial dimensional tear has manifested. Conquer the milestones to defeat the dungeon boss.',
      bossName: bossName,
      bossHpMax: 100,
      bossHpCurrent: 100,
      completed: false,
      extracted: false,
      xpReward: rewards.xp,
      goldReward: rewards.gold,
      tasks: formattedTasks
    };

    this.state.dungeons.push(newDungeon);
    window.systemAudio.playSystemAlert();
    this.app.showNotification(`[GATE MANIFESTED] ${rank}-Rank Gate: "${newDungeon.title}" open!`);

    // Sync 3D Gate color
    if (this.app.scene3D) {
      this.app.scene3D.setGateRankColor(rank);
    }

    this.app.persistAndRender();
  }

  toggleDungeonTask(dungeonId, taskId, event = null) {
    const dungeon = this.state.dungeons.find(d => d.id === dungeonId);
    if (!dungeon || dungeon.completed) return;

    const task = dungeon.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    this.recalculateTaskDamages(dungeon);

    window.systemAudio.playClick();

    if (task.completed) {
      this.app.triggerScreenShake();
      if (event) {
        const rect = event.target.getBoundingClientRect();
        this.app.showFloatingCombatText(rect.left + 30, rect.top - 10, `BOSS HIT: -${task.damage}% HP!`, 'damage');
      }
    }

    if (dungeon.bossHpCurrent === 0 && !dungeon.completed) {
      this.clearDungeon(dungeon);
    } else {
      this.app.persistAndRender();
    }
  }

  // Task Configuration inside existing Dungeon
  addTaskToDungeon(dungeonId, taskText) {
    const dungeon = this.state.dungeons.find(d => d.id === dungeonId);
    if (!dungeon || dungeon.completed) return;

    dungeon.tasks.push({
      id: 'task_' + Date.now(),
      text: taskText.trim(),
      completed: false,
      damage: 10
    });

    this.recalculateTaskDamages(dungeon);
    window.systemAudio.playClick();
    this.app.showNotification(`[MILESTONE ADDED] Objective added to ${dungeon.title}`);
    this.app.persistAndRender();
  }

  editDungeonTask(dungeonId, taskId, newText) {
    const dungeon = this.state.dungeons.find(d => d.id === dungeonId);
    if (!dungeon) return;

    const task = dungeon.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.text = newText.trim();
    window.systemAudio.playClick();
    this.app.persistAndRender();
  }

  deleteDungeonTask(dungeonId, taskId) {
    const dungeon = this.state.dungeons.find(d => d.id === dungeonId);
    if (!dungeon || dungeon.tasks.length <= 1) {
      alert("A Dungeon Gate must have at least 1 milestone task!");
      return;
    }

    dungeon.tasks = dungeon.tasks.filter(t => t.id !== taskId);
    this.recalculateTaskDamages(dungeon);
    window.systemAudio.playClick();
    this.app.persistAndRender();
  }

  clearDungeon(dungeon) {
    dungeon.completed = true;
    window.systemAudio.playGateClear();
    this.app.triggerScreenShake();

    this.app.addXp(dungeon.xpReward);
    this.state.gold += dungeon.goldReward;
    this.state.crystals = (this.state.crystals || 0) + (dungeon.rank === 'S' || dungeon.rank === 'A' ? 5 : 2);

    this.app.unlockTitle('wolf_slayer');

    this.app.showModalNotification(
      `GATE CLEARED: [${dungeon.rank}-RANK GATE]`,
      `The Dungeon Boss [${dungeon.bossName}] has fallen!\n\nREWARDS:\n• +${dungeon.xpReward} EXP\n• +${dungeon.goldReward} Gold\n• +Crystals Acquired\n\nA shadowy essence lingers over the fallen boss...`,
      () => {
        this.app.openShadowExtractionModal(dungeon);
      }
    );

    this.app.persistAndRender();
  }

  deleteDungeon(dungeonId) {
    this.state.dungeons = this.state.dungeons.filter(d => d.id !== dungeonId);
    window.systemAudio.playClick();
    this.app.persistAndRender();
  }
}

window.DungeonManager = DungeonManager;
