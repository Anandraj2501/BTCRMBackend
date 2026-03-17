const AppException = require('./AppException');
class ValidationException extends AppException {
    constructor(message) {
        super(message, 400);
    }
}
module.exports = ValidationException;
