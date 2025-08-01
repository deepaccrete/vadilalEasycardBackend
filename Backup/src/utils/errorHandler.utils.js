const createError = (message, statusCode) => {
    let error = {};
    error.message = message;
    error.statusCode = statusCode;
    return error;
};

module.exports = { createError };