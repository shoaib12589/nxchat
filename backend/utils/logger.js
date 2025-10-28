const fs = require('fs');
const path = require('path');

class Logger {
  constructor(logDir = path.join(__dirname, '../logs')) {
    this.logDir = logDir;
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  writeLog(filename, message) {
    const logPath = path.join(this.logDir, filename);
    fs.appendFileSync(logPath, message + '\n');
  }

  info(message, meta = {}) {
    const formattedMessage = this.formatMessage('info', message, meta);
    this.writeLog('system.log', formattedMessage);
    console.log(formattedMessage);
  }

  error(message, meta = {}) {
    const formattedMessage = this.formatMessage('error', message, meta);
    this.writeLog('error.log', formattedMessage);
    console.error(formattedMessage);
  }

  warn(message, meta = {}) {
    const formattedMessage = this.formatMessage('warn', message, meta);
    this.writeLog('warning.log', formattedMessage);
    console.warn(formattedMessage);
  }

  debug(message, meta = {}) {
    const formattedMessage = this.formatMessage('debug', message, meta);
    this.writeLog('debug.log', formattedMessage);
    console.debug(formattedMessage);
  }

  // Generate sample logs for testing
  generateSampleLogs() {
    const levels = ['info', 'warn', 'error', 'debug'];
    const messages = [
      'User authentication successful',
      'Database connection established',
      'Cache miss for key: user_123',
      'API request processed',
      'File upload completed',
      'Email sent successfully',
      'System backup started',
      'Performance optimization applied',
      'Memory usage: 45.2MB',
      'CPU usage: 12.5%',
      'Socket connection established',
      'Widget loaded for tenant',
      'Agent status updated',
      'Visitor message received',
      'AI response generated',
      'Chat session ended',
      'System maintenance completed',
      'Security scan passed',
      'Backup verification successful',
      'System health check passed'
    ];

    // Generate logs for the past 24 hours
    const now = new Date();
    for (let i = 0; i < 100; i++) {
      const logTime = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);
      const level = levels[Math.floor(Math.random() * levels.length)];
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      const timestamp = logTime.toISOString();
      const formattedMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
      
      this.writeLog('system.log', formattedMessage);
    }
  }
}

module.exports = Logger;
