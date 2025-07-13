// Utility to get current domain for Firebase configuration
export function getCurrentDomain(): string {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return 'localhost';
}

export function getFullDomain(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:5000';
}

export function displayDomainInfo() {
  if (typeof window !== 'undefined') {
    console.log('Current domain info:', {
      hostname: window.location.hostname,
      origin: window.location.origin,
      href: window.location.href
    });
  }
}