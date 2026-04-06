/**
 * Device Fingerprint Utility
 * Generates and manages unique device identifiers stored in localStorage.
 */

const DEVICE_ID_KEY = 'device_id';

/**
 * Get or create a unique device ID stored in localStorage.
 * Uses crypto.randomUUID() for generation.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Detect the browser name from the user agent string.
 */
function detectBrowser(userAgent: string): string {
  if (userAgent.includes('Edg/')) return 'Edge';
  if (userAgent.includes('OPR/') || userAgent.includes('Opera')) return 'Opera';
  if (userAgent.includes('Chrome/')) return 'Chrome';
  if (userAgent.includes('Firefox/')) return 'Firefox';
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) return 'Safari';
  return 'Desconhecido';
}

/**
 * Detect the operating system from the user agent string.
 */
function detectOS(userAgent: string): string {
  if (userAgent.includes('Windows NT 10')) return 'Windows 10';
  if (userAgent.includes('Windows NT 6.3')) return 'Windows 8.1';
  if (userAgent.includes('Windows NT 6.1')) return 'Windows 7';
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS X')) {
    const match = userAgent.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
    if (match) {
      return 'macOS ' + match[1].replace(/_/g, '.');
    }
    return 'macOS';
  }
  if (userAgent.includes('Android')) {
    const match = userAgent.match(/Android (\d+\.?\d*)/);
    if (match) return 'Android ' + match[1];
    return 'Android';
  }
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    const match = userAgent.match(/OS (\d+_\d+)/);
    if (match) return 'iOS ' + match[1].replace('_', '.');
    return 'iOS';
  }
  if (userAgent.includes('Linux')) return 'Linux';
  return 'Desconhecido';
}

/**
 * Get a user-friendly device name combining browser and OS.
 * Example: "Chrome - Windows 10"
 */
export function getDeviceName(): string {
  if (typeof window === 'undefined') {
    return 'Servidor';
  }

  const userAgent = navigator.userAgent;
  const browser = detectBrowser(userAgent);
  const os = detectOS(userAgent);
  return `${browser} - ${os}`;
}

/**
 * Get full device information.
 */
export function getDeviceInfo(): {
  name: string;
  userAgent: string;
  platform: string;
} {
  if (typeof window === 'undefined') {
    return {
      name: 'Servidor',
      userAgent: '',
      platform: '',
    };
  }

  return {
    name: getDeviceName(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
  };
}
