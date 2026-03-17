const optionSetRepository = require('../repositories/optionSetRepository');

class OptionSetService {
    async createOptionSet(data) {
        if (!data.name) throw new Error('name is required');
        if (!data.options || !Array.isArray(data.options)) throw new Error('options array is required');
        data.name = data.name.toLowerCase().replace(/\s+/g, '_');
        return await optionSetRepository.createOptionSet(data);
    }

    async getAllOptionSets() {
        return await optionSetRepository.getAllOptionSets();
    }

    async getOptionSetById(id) {
        const os = await optionSetRepository.getOptionSetById(id);
        if (!os) throw new Error(`OptionSet ${id} not found`);
        return os;
    }

    async updateOptionSet(id, data) {
        return await optionSetRepository.updateOptionSet(id, data);
    }

    async getOptionSetByAttributeId(attributeId) {
        return await optionSetRepository.getOptionSetByAttributeId(attributeId);
    }
}

module.exports = new OptionSetService();
