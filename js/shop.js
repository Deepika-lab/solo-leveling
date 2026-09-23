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
      used: false
    };

    this.state.inventory = this.state.inventory || [];
    this.state.inventory.unshift(inventoryItem);

    window.systemAudio.playQuestComplete();
    this.app.showNotification(`[ITEM ACQUIRED] "${item.name}" added to Inventory!`);
    this.app.persistAndRender();
  }

  redeemItem(invId) {
    const item = (this.state.inventory || []).find(i => i.id === invId);
    if (!item) return;

    item.used = true;
    window.systemAudio.playClick();
    this.app.showNotification(`[REWARD CLAIMED] Enjoy: "${item.name}"!`);
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
