class ApiResponse {
    static success(message, data = {}) {
        return {
            success: true,
            message: message,
            data: data
        };
    }

    static error(message) {
        return {
            success: false,
            message: message
        };
    }
}
module.exports = ApiResponse;
