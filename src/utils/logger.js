const logger = {
  info: (message) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`);
  },
  error: (message, error) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error || '');
  },
  warn: (message) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`);
  },
  debug: (message) => {
    console.debug(`[DEBUG] ${new Date().toISOString()}: ${message}`);
  }
};

module.exports = logger; 