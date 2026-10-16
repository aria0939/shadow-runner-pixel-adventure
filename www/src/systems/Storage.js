// systems/Storage.js — Persistent state via LocalStorage.

const KEY = "shadow-runner-save-v1";

const DEFAULT = {
  unlockedLevels: 1,
  maxLevelReached: 1,
  totalCoins: 0,
  totalScore: 0,
  muted: false,
  volume: 0.7,
};

export class Storage {
  static load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULT };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT, ...parsed };
    } catch (e) {
      return { ...DEFAULT };
    }
  }

  static save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  static reset() {
    try {
      localStorage.removeItem(KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  static unlockLevel(level) {
    const d = this.load();
    if (level > d.unlockedLevels) d.unlockedLevels = level;
    if (level > d.maxLevelReached) d.maxLevelReached = level;
    this.save(d);
  }

  static addCoins(n) {
    const d = this.load();
    d.totalCoins = (d.totalCoins || 0) + n;
    this.save(d);
    return d.totalCoins;
  }

  static addScore(n) {
    const d = this.load();
    d.totalScore = (d.totalScore || 0) + n;
    this.save(d);
    return d.totalScore;
  }
}
