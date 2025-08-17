// Auto-generated version file
// Do not edit manually - this file is updated by scripts/generate-version.js

export const BUILD_VERSION = '25.08.16-dev.9';
export const BUILD_DATE = '2025-08-17T03:19:53.531Z';
export const BUILD_TIMESTAMP = 1755400793531;
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
