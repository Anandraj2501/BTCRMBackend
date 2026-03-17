const viewRepository = require('../repositories/viewRepository');

class ViewService {
    async saveView(data) {
        if (!data.entitylogicalname) throw new Error('entitylogicalname is required');
        if (!data.viewname) throw new Error('viewname is required');
        if (!data.definition) throw new Error('definition is required');
        return await viewRepository.saveView(data);
    }

    async getViewsForEntity(logicalName) {
        return await viewRepository.getViewsForEntity(logicalName);
    }

    async getDefaultView(logicalName) {
        return await viewRepository.getDefaultView(logicalName);
    }
}

module.exports = new ViewService();
