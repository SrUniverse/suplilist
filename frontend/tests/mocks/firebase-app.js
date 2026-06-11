// Stub de firebase/app para testes — evita inicialização real do SDK
// (auth/invalid-api-key) em ambiente vitest.
export function initializeApp(config) {
  return { name: '[TEST]', options: config };
}

export function getApp() {
  return { name: '[TEST]', options: {} };
}

export function getApps() {
  return [];
}
