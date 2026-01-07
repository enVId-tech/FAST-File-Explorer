import React from 'react';
import './VersionBadge.scss';
import { getProjectVersion, getVersionInfo } from 'npm-version-lib';

interface VersionBadgeProps {
  className?: string;
  showTooltip?: boolean;
}

export const VersionBadge: React.FC<VersionBadgeProps> = ({
  className = '',
  showTooltip = true
}) => {
  const version = getProjectVersion();
  let versionInfo = null;
  
  try {
    versionInfo = getVersionInfo();
  } catch (error) {
    console.warn('Failed to get version info:', error);
  }

  const formatBuildDate = () => {
    if (versionInfo?.timestamp) {
      try {
        return new Date(versionInfo.timestamp).toLocaleString();
      } catch (error) {
        return new Date().toLocaleString();
      }
    }
    return new Date().toLocaleString();
  };

  const getBuildInfo = () => {
    if (!versionInfo) {
      return version || 'Unknown';
    }
    return `${versionInfo.version} (Build #${versionInfo.buildNumber})`;
  };

  return (
    <div
      className={`version-badge ${className}`}
      title={showTooltip ? `Version: ${version || 'Unknown'}\nBuild: #${versionInfo?.buildNumber || 'N/A'}\nRelease Type: ${versionInfo?.releaseType || 'Unknown'}\nBuilt on: ${formatBuildDate()}` : undefined}
    >
      {version || 'Unknown'}
    </div>
  );
};

export default VersionBadge;
