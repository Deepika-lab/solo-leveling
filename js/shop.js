/**
 * shop.js - Hunter Shop & Real-Life Reward Inventory
 */

class ShopManager {
  constructor(app) {
    this.app = app;
  }

  get state() {
    return this.app.state;
  }

  buyItem(itemId) {
    const item = (this.state.shopItems || []).find(i => i.id === itemId);
    if (!item) return;

    if (this.state.gold < item.cost) {
      window.systemAudio.playWarning();
      this.app.showNotification(`[INSUFFICIENT GOLD] You need ${item.cost} Gold (Current: ${this.state.gold})`);
      return;
    }

    this.state.gold -= item.cost;
    const inventoryItem = {
      id: 'inv_' + Date.now(),
      name: item.name,
      icon: item.icon || '🎁',
      category: item.category || 'General',
      boughtAt: new Date().toLocaleDateString(),
      used: false,
      type: item.type || null,
      healAmount: item.healAmount || null,
      manaAmount: item.manaAmount || null,
      xpAmount: item.xpAmount || null
    };

    this.state.inventory = this.state.inventory || [];
    this.state.inventory.unshift(inventoryItem);

    window.systemAudio.playQuestComplete();
    this.app.showNotification(`[ITEM ACQUIRED] "${item.name}" added to Inventory!`);
    this.app.persistAndRender();
  }

  redeemItem(invId) {
    const item = (this.state.inventory || []).find(i => i.id === invId);
    if (!item || item.used) return;

    item.used = true;
    window.systemAudio.playPotionConsume();
    this.app.triggerScreenShake();

    if (item.type === 'hp_potion' || item.name.includes('Health') || item.name.includes('Potion')) {
      const maxHp = window.HunterModels.calculateMaxHp(this.state.stats.vit);
      const healAmt = item.healAmount || 100;
      this.state.currentHp = Math.min(maxHp, this.state.currentHp + healAmt);
      this.app.showNotification(`[CONSUMED] Used "${item.name}"! Restored +${healAmt} HP!`);
    } else if (item.type === 'mp_potion' || item.name.includes('Mana')) {
      const maxMp = window.HunterModels.calculateMaxMp(this.state.stats.int);
      const manaAmt = item.manaAmount || 100;
      this.state.currentMp = Math.min(maxMp, this.state.currentMp + manaAmt);
      this.app.showNotification(`[CONSUMED] Used "${item.name}"! Restored +${manaAmt} MP!`);
    } else if (item.type === 'xp_scroll' || item.name.includes('EXP') || item.name.includes('Scroll')) {
      const xpAmt = item.xpAmount || 80;
      this.state.currentXp += xpAmt;
      this.app.showNotification(`[CONSUMED] Studied "${item.name}"! +${xpAmt} EXP gained!`);
      this.app.checkLevelUp();
    } else if (item.type === 'stat_elixir' || item.name.includes('Stat') || item.name.includes('Elixir')) {
      this.state.unallocatedPoints += 1;
      this.app.showNotification(`[CONSUMED] Drank "${item.name}"! +1 Stat Point gained!`);
    } else {
      this.app.showNotification(`[REWARD CLAIMED] Enjoy: "${item.name}"!`);
    }

    this.app.persistAndRender();
  }

  removeInventoryItem(invId) {
    this.state.inventory = (this.state.inventory || []).filter(i => i.id !== invId);
    window.systemAudio.playClick();
    this.app.persistAndRender();
  }

  addNewShopItem(name, cost, icon, category) {
    const newItem = {
      id: 'reward_' + Date.now(),
      name: name.trim(),
      cost: Math.max(1, parseInt(cost) || 50),
      icon: icon.trim() || '🎁',
      category: category.trim() || 'Custom'
    };

    this.state.shopItems = this.state.shopItems || [];
    this.state.shopItems.push(newItem);

    window.systemAudio.playClick();
    this.app.showNotification(`[SHOP UPDATED] New reward "${newItem.name}" added!`);
    this.app.persistAndRender();
  }

  deleteShopItem(itemId) {
    this.state.shopItems = (this.state.shopItems || []).filter(i => i.id !== itemId);
    window.systemAudio.playClick();
    this.app.persistAndRender();
  }
}

window.ShopManager = ShopManager;
