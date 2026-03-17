const AppException = require('./AppException');
class NotFoundException extends AppException {
    constructor(message = 'Record not found.') {
        super(message, 404);
    }
}
module.exports = NotFoundException;
