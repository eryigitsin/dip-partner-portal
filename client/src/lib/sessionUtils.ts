/**
 * Session conflict resolution utilities for handling PHP vs Node.js session conflicts
 */

export interface SessionConflictResult {
  conflict: boolean;
  action?: 'clear_php_session' | 'require_login';
  message?: string;
  instructions?: {
    cookie_to_clear: string;
    domain: string;
    path: string;
  };
}

/**
 * Check for session conflicts between PHP and Node.js sessions
 */
export async function checkSessionConflict(): Promise<SessionConflictResult> {
  try {
    const response = await fetch('/api/auth/resolve-session-conflict', {
      method: 'POST',
      credentials: 'include'
    });
    
    return await response.json();
  } catch (error) {
    console.error('Failed to check session conflict:', error);
    return { conflict: false };
  }
}

/**
 * Clear conflicting PHP session cookie
 */
export function clearPHPSession(): void {
  // Clear PHPSESSID cookie for .dip.tc domain
  document.cookie = "PHPSESSID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.dip.tc;";
  document.cookie = "PHPSESSID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  
  console.log('🗑️ Cleared PHP session cookie');
}

/**
 * Handle session conflicts automatically
 */
export async function resolveSessionConflict(): Promise<boolean> {
  const result = await checkSessionConflict();
  
  if (!result.conflict) {
    return true; // No conflict, proceed normally
  }
  
  console.log('⚠️ Session conflict detected:', result.message);
  
  if (result.action === 'clear_php_session') {
    clearPHPSession();
    console.log('🔄 PHP session cleared, proceeding with Node.js session');
    return true;
  }
  
  if (result.action === 'require_login') {
    console.log('🔐 Re-login required due to session conflict');
    // Redirect to login or show login modal
    window.location.href = '/login';
    return false;
  }
  
  return true;
}

/**
 * Check if current domain has session conflicts
 */
export function hasSessionConflictIndicators(): boolean {
  const cookies = document.cookie;
  const hasDipSession = cookies.includes('dip_session');
  const hasPHPSession = cookies.includes('PHPSESSID');
  const isDipDomain = window.location.hostname.includes('dip.tc');
  
  // Conflict if both sessions exist on dip.tc domain
  return isDipDomain && hasDipSession && hasPHPSession;
}