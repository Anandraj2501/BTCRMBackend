const metadataService = require('../services/metadataService');

const validateEntityMetadata = async (req, res, next) => {
    try {
        const { logicalname } = req.params;
        // This will throw EntityNotFoundException if not found
        await metadataService.getEntityDefinition(logicalname);
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { validateEntityMetadata };
