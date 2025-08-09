import React, { useState, useMemo } from 'react';
import * as ReactIcons from 'react-icons/fa';
import * as MaterialIcons from 'react-icons/md';
import * as BootstrapIcons from 'react-icons/bs';
import * as FeatherIcons from 'react-icons/fi';
import './IconSelector.scss';

interface IconSelectorProps {
  selectedIcon: string;
  onIconSelect: (iconName: string) => void;
  category?: 'fa' | 'md' | 'bs' | 'fi';
}

// Common drive and folder related icons
const driveIcons = {
  // Font Awesome icons
  FaHdd: ReactIcons.FaHdd,
  FaUsb: ReactIcons.FaUsb,
  FaCompactDisc: ReactIcons.FaCompactDisc,
  FaServer: ReactIcons.FaServer,
  FaCloud: ReactIcons.FaCloud,
  FaFolder: ReactIcons.FaFolder,
  FaFolderOpen: ReactIcons.FaFolderOpen,
  FaDatabase: ReactIcons.FaDatabase,
  FaNetworkWired: ReactIcons.FaNetworkWired,
  FaSdCard: ReactIcons.FaSdCard,
  FaMicrochip: ReactIcons.FaMicrochip,
  FaMemory: ReactIcons.FaMemory,
  FaLaptop: ReactIcons.FaLaptop,
  FaDesktop: ReactIcons.FaDesktop,
  FaMobile: ReactIcons.FaMobile,
  FaTablet: ReactIcons.FaTablet,
  FaGamepad: ReactIcons.FaGamepad,
  FaCameraRetro: ReactIcons.FaCameraRetro,
  FaVideo: ReactIcons.FaVideo,
  FaMusic: ReactIcons.FaMusic,
  FaImage: ReactIcons.FaImage,
  FaFilm: ReactIcons.FaFilm,
  FaHeadphones: ReactIcons.FaHeadphones,
  FaKeyboard: ReactIcons.FaKeyboard,
  FaMouse: ReactIcons.FaMouse,
  FaPrint: ReactIcons.FaPrint,
  FaWifi: ReactIcons.FaWifi,
  FaBluetooth: ReactIcons.FaBluetooth,
  FaUsb2: ReactIcons.FaUsb,
  FaEthernet: ReactIcons.FaEthernet,
  FaSatellite: ReactIcons.FaSatellite,
  FaRocket: ReactIcons.FaRocket,
  FaCog: ReactIcons.FaCog,
  FaTools: ReactIcons.FaTools,
  FaBox: ReactIcons.FaBox,
  FaArchive: ReactIcons.FaArchive,
  FaShieldAlt: ReactIcons.FaShieldAlt,
  FaLock: ReactIcons.FaLock,
  FaKey: ReactIcons.FaKey,
  FaGem: ReactIcons.FaGem,
  FaStar: ReactIcons.FaStar,
  FaHeart: ReactIcons.FaHeart,
  FaFire: ReactIcons.FaFire,
  FaBolt: ReactIcons.FaBolt,
  FaMagic: ReactIcons.FaMagic,
  FaSnowflake: ReactIcons.FaSnowflake,
  FaSun: ReactIcons.FaSun,
  FaMoon: ReactIcons.FaMoon,
  FaCloudSun: ReactIcons.FaCloudSun,
  FaCloudRain: ReactIcons.FaCloudRain,
  FaUmbrella: ReactIcons.FaUmbrella,
};

export const IconSelector: React.FC<IconSelectorProps> = ({
  selectedIcon,
  onIconSelect,
  category = 'fa'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIcons = useMemo(() => {
    const iconEntries = Object.entries(driveIcons);
    if (!searchTerm) return iconEntries;
    
    return iconEntries.filter(([iconName]) => 
      iconName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const SelectedIconComponent = driveIcons[selectedIcon as keyof typeof driveIcons];

  return (
    <div className="icon-selector">
      <button 
        className="icon-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Select Icon"
      >
        {SelectedIconComponent ? <SelectedIconComponent /> : <ReactIcons.FaFolder />}
        <span>{selectedIcon}</span>
      </button>

      {isOpen && (
        <div className="icon-selector-dropdown">
          <div className="icon-search">
            <input
              type="text"
              placeholder="Search icons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="icon-search-input"
            />
          </div>
          
          <div className="icon-grid">
            {filteredIcons.map(([iconName, IconComponent]) => (
              <button
                key={iconName}
                className={`icon-option ${selectedIcon === iconName ? 'selected' : ''}`}
                onClick={() => {
                  onIconSelect(iconName);
                  setIsOpen(false);
                }}
                title={iconName}
              >
                <IconComponent />
                <span className="icon-name">{iconName}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
