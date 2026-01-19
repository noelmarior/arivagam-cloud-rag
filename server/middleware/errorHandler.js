// server/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
    // 1. Log the error for the developer (You)
    console.error(`❌ Error: ${err.message}`);
    // console.error(err.stack); // Uncomment if you want full stack traces

    // 2. Determine status code (Default to 500)
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    // 3. Send clean JSON to the frontend
    res.status(statusCode).json({
        success: false,
        error: err.message || 'Server Error'
    });
};

module.exports = errorHandler;