export const SimulationConfig = {
  // 60 means 1 real minute = 1 game hour.
  // This produces fast gameplay for early testing (24 min = 1 game day)
  INITIAL_SCALE_FACTOR: 60,

  // Economic constants for MVP
  STARTING_WALLET_BALANCE: 5000,
  CURRENCY: 'NGN',

  // Rules
  MAX_ACTIVE_CHARACTERS_PER_ACCOUNT: 1,

  // UI / Display configurations
  LOCALE: 'en-NG',
  TIMEZONE: 'Africa/Lagos',
};

export const FeatureFlags = {
  // Phase 1 MVP features
  MVP_ECONOMY_ENABLED: true,
  MVP_SOCIAL_ENABLED: true,
  
  // Phase 2+ features (disabled for now)
  ORGANIZATIONS_ENABLED: false,
  POLITICS_ENABLED: false,
  BUSINESS_OWNERSHIP_ENABLED: false,
};
