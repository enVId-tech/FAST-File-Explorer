// Auto-generated version file
// Do not edit manually - this file is updated by scripts/generate-version.js

export const BUILD_VERSION = '25.08.26-dev.1';
export const BUILD_DATE = '2025-08-26T17:33:57.769Z';
export const BUILD_TIMESTAMP = 1756229637769;
export const BUILD_INFO = {
  version: BUILD_VERSION,
  date: BUILD_DATE,
  timestamp: BUILD_TIMESTAMP,
};

// Helper function to get readable build date
export const getBuildDateString = (): string => {
  return new Date(BUILD_TIMESTAMP).toLocaleDateString();
};

// Helper function to get version display string
export const getVersionDisplayString = (): string => {
  return `v${BUILD_VERSION}`.split('-')[0];
};
