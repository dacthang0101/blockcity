class AppError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = options.code || "UNKNOWN_ERROR";
        this.status = options.status || 500;
        this.details = options.details || null;
    }
}

module.exports = AppError;