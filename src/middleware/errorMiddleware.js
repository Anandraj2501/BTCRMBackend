const ApiResponse = require('../responses/ApiResponse');
const AppException = require('../exceptions/AppException');

const errorMiddleware = (err, req, res, next) => {
    console.error('Error:', err);
    
    if (err instanceof AppException) {
        return res.status(err.statusCode).json(ApiResponse.error(err.message));
    }

    // Default 500
    res.status(500).json(ApiResponse.error(err.message || 'Internal server error'));
};

module.exports = errorMiddleware;
