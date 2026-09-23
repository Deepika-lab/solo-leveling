# THE SYSTEM | Solo Leveling Life RPG & Personal Growth App

An authentic, manhwa-inspired life gamification and habit tracking web application designed to turn your real-world personal growth into an immersive Hunter leveling experience.

---

## ⚡ Quick Start

### Option 1: Direct File Launch
Simply double-click `index.html` or open it in any modern browser (Chrome, Safari, Edge, Firefox).

### Option 2: Local Web Server (macOS built-in)
Run the following in terminal from this folder:
```bash
ruby -run -e httpd . -p 8080
```
Then visit: [http://localhost:8080](http://localhost:8080)

---

## 🗡️ Core Features & Mechanics

### 1. Hunter Rank & Level Progression
- **Hunter Ranks**: E-Rank (Lv 1–9) up to S-Rank (Lv 70–89) and National Level / Monarch (Lv 90+).
- **Attributes**:
  - **STR (Strength)**: Workouts, fitness, athletic activity.
  - **AGI (Agility)**: Speed, chores turnaround, punctuality.
  - **INT (Intelligence)**: Reading, deep work, coding, learning.
  - **VIT (Vitality)**: Sleep, nutrition, recovery (boosts max HP).
  - **PER (Perception)**: Mindfulness, meditation, journaling.
- **Stat Point Allocation**: Each Level Up awards **+3 Stat Points** that you can distribute into any attribute.
- **Dynamic Radar Chart**: An interactive 5-axis pentagon visualizer dynamically charts your stat balance.

### 2. [Daily Quest: Preparation to Become Strong]
- Modeled after the iconic 100 Push-ups, 100 Sit-ups, 100 Squats, and 10km Run regimen.
- Complete individual increments or set custom values.
- Clear the entire physical regimen for a massive **+100 EXP, +50 Gold, and stat bonuses**.
- **Custom Daily Quests**: Add your own recurring daily habits with custom stat boosts and EXP rewards.

### 3. The Penalty Zone Protocol
- If daily quests are not completed within the daily reset cycle, the System triggers the **PENALTY ZONE**.
- Drains HP and issues an emergency survival trial to escape the penalty zone.

### 4. Dungeon Gates (Project Raids)
- Model multi-step goals, exams, or major projects as **Dungeon Gates** (from E-Rank to S-Rank).
- Check off milestone objectives to deal direct damage to the Dungeon Boss HP.
- Defeating the boss clears the gate and awards massive EXP, Gold, and rare Crystals.

### 5. Shadow Extraction ("ARISE")
- Once a Dungeon Gate is conquered, invoke the legendary command **"ARISE"**.
- Extract the defeated challenge into a permanent **Shadow Soldier** added to your **Shadow Army**.
- Build an eternal trophy army of your greatest life achievements.

### 6. Hunter Shop & Real-Life Inventory
- Spend accumulated Hunter Gold on custom real-life rewards (e.g. 1 hour gaming, cheat meal, weekend trip).
- Track purchased items in your **Inventory** and click **Redeem** when enjoyed.

### 7. Audio & Persistence
- **Procedural Web Audio API**: Sci-fi level-up fanfares, system alerts, button clicks, and ethereal rumble upon invoking "ARISE"—all generated procedurally with zero external audio dependencies.
- **LocalStorage & JSON Backup**: Progress is auto-saved locally. Includes 1-click JSON export and import so you never lose your Hunter journey.
