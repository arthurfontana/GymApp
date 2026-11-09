// Substitui 'virtual:pwa-register' no build do Artifact (sem service worker).
export function registerSW() { return () => {}; }
