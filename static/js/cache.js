/**
 * Cache implementation with configurable expiration and size limits
 */
class Cache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.defaultTTL || 3600000; // 1 hour in ms
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
  }

  /**
   * Set an item in the cache with optional time-to-live
   * @param {string} key - Cache key
   * @param {*} value - Value to store
   * @param {number} ttl - Time-to-live in ms (optional)
   */
  set(key, value, ttl = this.defaultTTL) {
    // Clean up expired items before potential eviction
    this.cleanup();

    // If cache is full, evict least recently used item
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const expiresAt = ttl ? Date.now() + ttl : null;

    this.cache.set(key, {
      value,
      expiresAt,
      lastAccessed: Date.now(),
    });

    return value;
  }

  /**
   * Get an item from the cache
   * @param {string} key - Cache key
   * @returns {*} Value or undefined if not found/expired
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      this.stats.misses++;
      return undefined;
    }

    // Check if item has expired
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Update last accessed time
    item.lastAccessed = Date.now();
    this.stats.hits++;
    return item.value;
  }

  /**
   * Remove an item from the cache
   * @param {string} key - Cache key
   * @returns {boolean} True if item was found and removed
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear the entire cache
   */
  clear() {
    this.cache.clear();
    return true;
  }

  /**
   * Check if cache has a non-expired item
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Remove all expired items from cache
   */
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && item.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Evict the least recently used item
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Stats object
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
    };
  }
}