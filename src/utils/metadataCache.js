class MetadataCache {
    constructor() {
        this.cache = {}; // e.g., { 'contact': { metadata: {...}, attributes: [...], lookups: [...] } }
    }

    setEntityMap(logicalName, data) {
        this.cache[logicalName] = data;
    }

    getEntityMap(logicalName) {
        return this.cache[logicalName] || null;
    }

    clear() {
        this.cache = {};
    }

    invalidateEntity(logicalName) {
        delete this.cache[logicalName];
    }
}

module.exports = new MetadataCache(); // Singleton
