/**
 * Yoco Payment Configuration
 * Public keys are safe to expose client-side
 */

export const YOCO_CONFIG = {
  // Live public key for production payments
  PUBLIC_KEY_LIVE: 'pk_live_d768e30a3oO0qjZ8ab24',
  
  // Test public key (to be added when available)
  PUBLIC_KEY_TEST: '', // Add your test public key here when needed
} as const;

/**
 * Get the appropriate public key based on test mode
 */
export const getYocoPublicKey = (testMode = false): string => {
  return testMode ? YOCO_CONFIG.PUBLIC_KEY_TEST : YOCO_CONFIG.PUBLIC_KEY_LIVE;
};
