const PREFIX = '[SupliList]';
const isDev = import.meta.env.DEV;

export const logger = {
  info:  isDev ? (msg, ...args) => console.info(PREFIX, msg, ...args)  : () => {},
  warn:  isDev ? (msg, ...args) => console.warn(PREFIX, msg, ...args)  : () => {},
  error: isDev ? (msg, ...args) => console.error(PREFIX, msg, ...args) : () => {},
  debug: isDev ? (msg, ...args) => console.debug(PREFIX, msg, ...args) : () => {},
};
