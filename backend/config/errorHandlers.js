/**
 * Global Process Error Handlers
 * 
 * These handlers catch errors that escape normal try-catch blocks
 * They are the LAST LINE OF DEFENSE against application crashes
 */

/**
 * Unhandled Promise Rejections
 * 
 * Catches async/await errors NOT caught with try-catch
 * Example: await User.findById('invalid') without try-catch
 */
const handleUnhandledRejection = (err, promise) => {
  console.error('═══════════════════════════════════════════════════════════');
  console.error('❌ UNHANDLED PROMISE REJECTION');
  console.error('═══════════════════════════════════════════════════════════');
  console.error('Error:', err);
  console.error('Promise:', promise);
  console.error('Stack:', err.stack);
  console.error('═══════════════════════════════════════════════════════════');
  
  // Exit with error code 1
  // In production, process manager (PM2/Docker) will restart
  process.exit(1);
};

/**
 * Uncaught Exceptions
 * 
 * Catches synchronous errors NOT caught
 * Example: null.toString() without try-catch
 * WARNING: App is in UNDEFINED STATE after this - must exit immediately
 */
const handleUncaughtException = (err, origin) => {
  console.error('═══════════════════════════════════════════════════════════');
  console.error('💥 UNCAUGHT EXCEPTION - CRITICAL ERROR');
  console.error('═══════════════════════════════════════════════════════════');
  console.error('Error:', err);
  console.error('Origin:', origin);
  console.error('Stack:', err.stack);
  console.error('═══════════════════════════════════════════════════════════');
  console.error('⚠️  Application in undefined state - exiting immediately');
  console.error('═══════════════════════════════════════════════════════════');
  
  // Exit immediately - don't try to clean up!
  process.exit(1);
};

/**
 * Setup all global error handlers
 */
const setupErrorHandlers = () => {
  process.on('unhandledRejection', handleUnhandledRejection);
  process.on('uncaughtException', handleUncaughtException);
};

module.exports = { setupErrorHandlers };

