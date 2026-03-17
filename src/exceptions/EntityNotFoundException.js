const AppException = require('./AppException');
class EntityNotFoundException extends AppException {
    constructor(entityName) {
        super(`Entity '${entityName}' does not exist in metadata.`, 404);
    }
}
module.exports = EntityNotFoundException;
