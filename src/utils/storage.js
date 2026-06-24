// Mock storage API for local development
const storage = {
  async get(key, shared = false) {
    try {
      const item = localStorage.getItem(key);
      if (!item) {
        throw new Error('Key not found');
      }
      return {
        key,
        value: item,
        shared
      };
    } catch (error) {
      throw error;
    }
  },

  async set(key, value, shared = false) {
    try {
      localStorage.setItem(key, value);
      return {
        key,
        value,
        shared
      };
    } catch (error) {
      return null;
    }
  },

  async delete(key, shared = false) {
    try {
      localStorage.removeItem(key);
      return {
        key,
        deleted: true,
        shared
      };
    } catch (error) {
      return null;
    }
  },

  async list(prefix = '', shared = false) {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      return {
        keys,
        prefix,
        shared
      };
    } catch (error) {
      return null;
    }
  }
};

// Attach to window
window.storage = storage;

export default storage;