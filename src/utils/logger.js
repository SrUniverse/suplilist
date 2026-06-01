const PREFIX = '[SupliList]';
const isDev = import.meta.env.DEV;

export const logger = {
  info:  isDev ? (msg, ...args) => console.info(PREFIX, msg, ...args)  : () => {},
  warn:  isDev ? (msg, ...args) => console.warn(PREFIX, msg, ...args)  : () => {},
  debug: isDev ? (msg, ...args) => console.debug(PREFIX, msg, ...args) : () => {},
  // P7: erros sempre capturados — console em dev, buffer em produção para diagnóstico
  error: (msg, ...args) => {
    if (isDev) {
      console.error(PREFIX, msg, ...args);
    } else {
      // Captura silenciosa em produção (acessível via window.__errors para debug)
      try {
        window.__errors = window.__errors || [];
        window.__errors.push({ msg, args, ts: Date.now() });
        // Limita o buffer a 50 erros para evitar vazamento de memória
        if (window.__errors.length > 50) window.__errors.shift();
      } catch (_) { /* ambiente sem window, e.g. SSR */ }
    }
  },
};
