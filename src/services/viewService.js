const viewRepository = require('../repositories/viewRepository');

class ViewService {
    async saveView(data) {
        if (!data.entitylogicalname) throw new Error('entitylogicalname is required');
        if (!data.viewname) throw new Error('viewname is required');
        if (!data.definition) throw new Error('definition is required');
        return await viewRepository.saveView(data);
    }

    async getViewsForEntity(logicalName, appId = null, ownerid = null) {
        return await viewRepository.getViewsForEntity(logicalName, appId, { ownerid });
    }

    async getDefaultView(logicalName, appId = null) {
        return await viewRepository.getDefaultView(logicalName, appId);
    }
}

module.exports = new ViewService();
