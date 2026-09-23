/**
 * models.js - Data Structures, Hunter Progression Formulas & Constants
 */

const HUNTER_RANKS = [
  { minLevel: 1,  maxLevel: 9,   rank: 'E', title: 'E-Rank Hunter', color: '#94a3b8', glow: 'rgba(148, 163, 184, 0.4)' },
  { minLevel: 10, maxLevel: 19,  rank: 'D', title: 'D-Rank Hunter', color: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)' },
  { minLevel: 20, maxLevel: 34,  rank: 'C', title: 'C-Rank Hunter', color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.4)' },
  { minLevel: 35, maxLevel: 49,  rank: 'B', title: 'B-Rank Hunter', color: '#818cf8', glow: 'rgba(129, 140, 248, 0.5)' },
  { minLevel: 50, maxLevel: 69,  rank: 'A', title: 'A-Rank Hunter', color: '#c084fc', glow: 'rgba(192, 132, 252, 0.5)' },
  { minLevel: 70, maxLevel: 89,  rank: 'S', title: 'S-Rank Hunter', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.6)' },
  { minLevel: 90, maxLevel: 999, rank: 'NATIONAL', title: 'National Level / Monarch', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.7)' },
];

const HUNTER_CLASSES = [
  { id: 'none', name: 'None (Hunter Initiate)', icon: '⚔️', perk: 'Balanced foundational growth (+1 all stats)' },
  { id: 'monarch', name: 'Shadow Monarch', icon: '👑', perk: 'Command defeated obstacles (+2 INT, +2 PER)' },
  { id: 'assassin', name: 'Shadow Assassin', icon: '🗡️', perk: 'Execution speed & rapid habit turnaround (+3 AGI, +1 PER)' },
  { id: 'striker', name: 'Berserker / Striker', icon: '🥊', perk: 'High-intensity workouts & physical power (+3 STR, +1 VIT)' },
  { id: 'mage', name: 'Arcane Scholar / Mage', icon: '🔮', perk: 'Deep mental work, coding & learning focus (+4 INT)' },
  { id: 'tank', name: 'Iron Defender / Tank', icon: '🛡️', perk: 'Sleep discipline, recovery & stamina (+4 VIT)' }
];

const STAT_DEFINITIONS = {
  str: { name: 'Strength', code: 'STR', desc: 'Muscular power, physical endurance & athletic capacity', color: '#ef4444' },
  agi: { name: 'Agility', code: 'AGI', desc: 'Execution speed, quick chore turnaround & reaction time', color: '#10b981' },
  int: { name: 'Intelligence', code: 'INT', desc: 'Deep focus, reading comprehension, coding & problem-solving', color: '#06b6d4' },
  vit: { name: 'Vitality', code: 'VIT', desc: 'Sleep quality, hydration, physical recovery & mental resilience', color: '#eab308' },
  per: { name: 'Perception', code: 'PER', desc: 'Sensory awareness, mindfulness, meditation & detail sharpness', color: '#a855f7' }
};

const DEFAULT_TITLES = [
  { id: 'awakened', name: 'The Awakened', desc: 'Granted to one chosen by the System.', unlocked: true },
  { id: 'wolf_slayer', name: 'Wolf Slayer', desc: 'Cleared your first Dungeon Gate.', unlocked: false },
  { id: 'iron_will', name: 'One Who Overcame Adversity', desc: 'Survive a Penalty Zone or hold a 7-day streak.', unlocked: false },
  { id: 'demon_hunter', name: 'Demon Hunter', desc: 'Reach Level 25 as an active Hunter.', unlocked: false },
  { id: 'architect', name: 'Architect of Destiny', desc: 'Achieve Level 50 and allocate over 100 stat points.', unlocked: false },
  { id: 'shadow_monarch', name: 'Shadow Monarch', desc: 'Command an army of at least 5 extracted shadows.', unlocked: false }
];

const DEFAULT_PRESET_REWARDS = [
  { id: 'reward_1', name: '1 Hour Gaming / Netflix', cost: 100, icon: '🎮', category: 'Leisure' },
  { id: 'reward_2', name: 'Gourmet / Cheat Meal', cost: 250, icon: '🍜', category: 'Treat' },
  { id: 'reward_3', name: 'Buy a New Book / Gadget', cost: 600, icon: '📚', category: 'Reward' },
  { id: 'reward_4', name: 'Full Guilt-Free Rest Evening', cost: 350, icon: '🛋️', category: 'Rest' },
  { id: 'reward_5', name: 'Weekend Trip / Special Event', cost: 1500, icon: '✈️', category: 'Major' }
];

const DEFAULT_REGIMEN = [
  { id: 'reg_pushups', label: 'Push-ups', current: 0, target: 100, unit: 'reps', icon: '💪', stat: 'str' },
  { id: 'reg_situps', label: 'Sit-ups', current: 0, target: 100, unit: 'reps', icon: '🧘', stat: 'str' },
  { id: 'reg_squats', label: 'Squats', current: 0, target: 100, unit: 'reps', icon: '🦵', stat: 'str' },
  { id: 'reg_running', label: 'Running', current: 0, target: 10, unit: 'km', icon: '🏃', stat: 'agi' }
];

function getXpRequired(level) {
  // Smooth mathematical progression curve
  return Math.floor(100 * Math.pow(level, 1.35));
}

function getHunterRank(level) {
  const found = HUNTER_RANKS.find(r => level >= r.minLevel && level <= r.maxLevel);
  return found || HUNTER_RANKS[0];
}

function calculateMaxHp(vitality) {
  return 100 + (vitality * 20);
}

function calculateMaxMp(intelligence) {
  return 50 + (intelligence * 15);
}

function getDefaultPlayerState() {
  const today = new Date().toISOString().split('T')[0];

  return {
    name: 'Deepika Mamidipelly',
    title: 'The Awakened',
    job: 'none',
    level: 1,
    currentXp: 0,
    gold: 50,
    crystals: 5,
    unallocatedPoints: 3,
    stats: {
      str: 10,
      agi: 10,
      int: 10,
      vit: 10,
      per: 10
    },
    currentHp: 300,
    currentMp: 200,
    streak: 0,
    lastActiveDate: today,
    penaltyEngaged: false,
    penaltyDeadline: null,
    unlockedTitles: ['awakened'],
    dailyRegimen: JSON.parse(JSON.stringify(DEFAULT_REGIMEN)),
    customQuests: [
      {
        id: 'quest_read',
        title: 'Deep Reading / Study (30 mins)',
        stat: 'int',
        statBonus: 1,
        xpReward: 35,
        goldReward: 20,
        completed: false,
        category: 'Learning'
      },
      {
        id: 'quest_water',
        title: 'Drink 2.5 Liters of Water',
        stat: 'vit',
        statBonus: 1,
        xpReward: 25,
        goldReward: 15,
        completed: false,
        category: 'Health'
      },
      {
        id: 'quest_clean',
        title: 'Clear Workspace / Chores (15 mins)',
        stat: 'agi',
        statBonus: 1,
        xpReward: 30,
        goldReward: 20,
        completed: false,
        category: 'Discipline'
      }
    ],
    dungeons: [
      {
        id: 'dungeon_intro',
        title: 'D-Rank Gate: The Awakening Sprint',
        rank: 'D',
        description: 'Complete 3 focused deep-work blocks and plan out your month.',
        bossName: 'Steel Fang Raikan',
        bossHpMax: 100,
        bossHpCurrent: 100,
        completed: false,
        extracted: false,
        xpReward: 250,
        goldReward: 150,
        tasks: [
          { id: 't1', text: 'Set clear 30-day personal goals', completed: false, damage: 34 },
          { id: 't2', text: 'Execute two 90-minute focus sessions', completed: false, damage: 33 },
          { id: 't3', text: 'Clean digital clutter and prepare study/workspace', completed: false, damage: 33 }
        ]
      }
    ],
    shadows: [
      {
        id: 'shadow_igris_init',
        name: 'Iron (Initial Shadow)',
        rank: 'Infantry',
        sourceGate: 'System Awakening Protocol',
        extractedAt: today,
        phrase: 'My blade obeys the Monarch.'
      }
    ],
    shopItems: [...DEFAULT_PRESET_REWARDS],
    inventory: []
  };
}

window.HunterModels = {
  HUNTER_RANKS,
  HUNTER_CLASSES,
  STAT_DEFINITIONS,
  DEFAULT_TITLES,
  DEFAULT_PRESET_REWARDS,
  DEFAULT_REGIMEN,
  getXpRequired,
  getHunterRank,
  calculateMaxHp,
  calculateMaxMp,
  getDefaultPlayerState
};
