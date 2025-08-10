import React from 'react';
import { BUILD_VERSION, getBuildDateString, getVersionDisplayString, BUILD_DATE } from '../../../version';
import './VersionBadge.scss';

interface VersionBadgeProps {
  className?: string;
  showTooltip?: boolean;
}

export const VersionBadge: React.FC<VersionBadgeProps> = ({ 
  className = '', 
  showTooltip = true 
}) => {
  const formatBuildDate = () => {
    try {
      return new Date(BUILD_DATE).toLocaleString();
    } catch (error) {
      return getBuildDateString();
    }
  };

  return (
    <div 
      className={`version-badge ${className}`}
      title={showTooltip ? `Build: ${BUILD_VERSION}\nBuilt on: ${formatBuildDate()}` : undefined}
    >
      {getVersionDisplayString()}
    </div>
  );
};

export default VersionBadge;
