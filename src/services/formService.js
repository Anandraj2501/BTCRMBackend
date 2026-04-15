const formRepository = require('../repositories/formRepository');

class FormService {
    async saveForm(data) {
        if (!data.entitylogicalname) throw new Error('entitylogicalname is required');
        if (!data.formname) throw new Error('formname is required');
        if (!data.definition) throw new Error('definition is required');
        return await formRepository.saveForm(data);
    }

    async getFormsForEntity(logicalName, appId = null) {
        return await formRepository.getFormsForEntity(logicalName, appId);
    }

    async getDefaultForm(logicalName, appId = null) {
        return await formRepository.getDefaultForm(logicalName, appId);
    }
}

module.exports = new FormService();
