/**
 * shadows.js - Shadow Extraction ("ARISE") and Shadow Army Management
 */

class ShadowManager {
  constructor(app) {
    this.app = app;
  }

  get state() {
    return this.app.state;
  }

  static getShadowRankForDungeon(rank) {
    switch (rank) {
      case 'E': return 'Shadow Infantry';
      case 'D': return 'Shadow Soldier';
      case 'C': return 'Shadow Elite Soldier';
      case 'B': return 'Shadow Knight';
      case 'A': return 'Shadow Elite Knight';
      case 'S': return 'Shadow General';
      default: return 'Shadow Soldier';
    }
  }

  static getShadowPraiseQuotes() {
    return [
      "My blade obeys the Monarch.",
      "The shadow of your past challenge now shields your future.",
      "A monumental achievement carved into eternity.",
      "Your domain expands; we stand ready for the next command.",
      "No obstacle shall hinder our Liege."
    ];
  }

  extractShadow(dungeon, customName) {
    if (dungeon.extracted) return;
    dungeon.extracted = true;

    const shadowRank = ShadowManager.getShadowRankForDungeon(dungeon.rank);
    const quotes = ShadowManager.getShadowPraiseQuotes();
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    const today = new Date().toISOString().split('T')[0];

    const shadowName = customName && customName.trim() ? customName.trim() : dungeon.bossName;

    const newShadow = {
      id: 'shadow_' + Date.now(),
      name: shadowName,
      rank: shadowRank,
      gateRank: dungeon.rank,
      sourceGate: dungeon.title,
      extractedAt: today,
      phrase: quote
    };

    this.state.shadows = this.state.shadows || [];
    this.state.shadows.unshift(newShadow);

    // Play Arise sound
    window.systemAudio.playArise();

    // Check achievement for Shadow Monarch title
    if (this.state.shadows.length >= 5) {
      this.app.unlockTitle('shadow_monarch');
    }

    this.app.showNotification(`[ARISE SUCCESSFUL] Shadow soldier "${shadowName}" has entered your army!`);
    this.app.persistAndRender();
  }

  dismissShadow(shadowId) {
    if (confirm("Release this shadow back into nothingness?")) {
      this.state.shadows = this.state.shadows.filter(s => s.id !== shadowId);
      window.systemAudio.playClick();
      this.app.persistAndRender();
    }
  }
}

window.ShadowManager = ShadowManager;
