const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function timestamp() {
  return new Date().toISOString().slice(11, 19);
}

export const logger = {
  info(msg) {
    console.log(`${COLORS.cyan}[${timestamp()}]${COLORS.reset} ${msg}`);
  },

  success(msg) {
    console.log(`${COLORS.green}[${timestamp()}] ✓${COLORS.reset} ${msg}`);
  },

  warn(msg) {
    console.log(`${COLORS.yellow}[${timestamp()}] ⚠${COLORS.reset} ${msg}`);
  },

  error(msg) {
    console.log(`${COLORS.red}[${timestamp()}] ✗${COLORS.reset} ${msg}`);
  },

  skip(msg) {
    console.log(`${COLORS.gray}[${timestamp()}] ⊘${COLORS.reset} ${msg}`);
  },

  divider() {
    console.log(`${COLORS.gray}${'─'.repeat(50)}${COLORS.reset}`);
  },
};
