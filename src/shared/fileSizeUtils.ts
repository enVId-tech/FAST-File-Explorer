/**
 * File size formatting utility with support for both decimal (SI) and binary (IEC) units
 */

export type FileSizeUnit = 'decimal' | 'binary';

interface UnitConfig {
    base: number;
    units: string[];
}

const UNIT_CONFIGS: Record<FileSizeUnit, UnitConfig> = {
    decimal: {
        base: 1000,
        units: ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    },
    binary: {
        base: 1024,
        units: ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
    }
};

/**
 * Format a file size in bytes to human-readable format
 * @param bytes - File size in bytes
 * @param unitType - Whether to use decimal (SI) or binary (IEC) units
 * @param precision - Number of decimal places (default: 2)
 * @returns Formatted size string (e.g., "1.50 GB" or "1.40 GiB")
 */
export function formatFileSize(
    bytes: number, 
    unitType: FileSizeUnit = 'decimal', 
    precision: number = 2
): string {
    if (bytes === 0) return '0 B';
    if (bytes < 0) return 'Invalid size';
    
    const config = UNIT_CONFIGS[unitType];
    const { base, units } = config;
    
    // Find the appropriate unit
    let unitIndex = 0;
    let size = bytes;
    
    while (size >= base && unitIndex < units.length - 1) {
        size /= base;
        unitIndex++;
    }
    
    // Format the number with specified precision
    const formattedSize = unitIndex === 0 
        ? size.toString() // Don't show decimals for bytes
        : size.toFixed(precision);
    
    return `${formattedSize} ${units[unitIndex]}`;
}

/**
 * Parse a formatted file size string back to bytes
 * @param sizeString - Formatted size string (e.g., "1.5 GB" or "1.4 GiB")
 * @returns Size in bytes, or null if parsing fails
 */
export function parseFileSize(sizeString: string): number | null {
    const match = sizeString.match(/^([\d.]+)\s*([A-Za-z]+)$/);
    if (!match) return null;
    
    const [, numberStr, unitStr] = match;
    const number = parseFloat(numberStr);
    const unit = unitStr.toUpperCase();
    
    if (isNaN(number)) return null;
    
    // Determine unit type and find unit index
    let unitType: FileSizeUnit;
    let unitIndex: number;
    
    if (unit.endsWith('IB') || unit.endsWith('B') && unit.length > 1) {
        // Binary units (KiB, MiB, GiB, etc.)
        unitType = 'binary';
        const binaryUnits = UNIT_CONFIGS.binary.units.map(u => u.toUpperCase());
        unitIndex = binaryUnits.indexOf(unit);
    } else {
        // Decimal units (KB, MB, GB, etc.)
        unitType = 'decimal';
        const decimalUnits = UNIT_CONFIGS.decimal.units.map(u => u.toUpperCase());
        unitIndex = decimalUnits.indexOf(unit);
    }
    
    if (unitIndex === -1) return null;
    
    const config = UNIT_CONFIGS[unitType];
    return Math.round(number * Math.pow(config.base, unitIndex));
}

/**
 * Get unit information for display purposes
 * @param unitType - Unit type
 * @returns Array of unit information objects
 */
export function getUnitInfo(unitType: FileSizeUnit) {
    const config = UNIT_CONFIGS[unitType];
    return config.units.map((unit, index) => ({
        unit,
        name: getUnitName(unit),
        factor: Math.pow(config.base, index),
        base: config.base
    }));
}

/**
 * Get the full name of a unit
 */
function getUnitName(unit: string): string {
    const names: Record<string, string> = {
        'B': 'Bytes',
        'KB': 'Kilobytes',
        'MB': 'Megabytes', 
        'GB': 'Gigabytes',
        'TB': 'Terabytes',
        'PB': 'Petabytes',
        'EB': 'Exabytes',
        'ZB': 'Zettabytes',
        'YB': 'Yottabytes',
        'KiB': 'Kibibytes',
        'MiB': 'Mebibytes',
        'GiB': 'Gibibytes',
        'TiB': 'Tebibytes',
        'PiB': 'Pebibytes',
        'EiB': 'Exbibytes',
        'ZiB': 'Zebibytes',
        'YiB': 'Yobibytes'
    };
    return names[unit] || unit;
}

/**
 * Convert between different unit types
 * @param size - Original size string
 * @param targetUnitType - Target unit type
 * @param precision - Precision for formatting
 * @returns Converted size string
 */
export function convertUnitType(
    size: string, 
    targetUnitType: FileSizeUnit, 
    precision: number = 2
): string | null {
    const bytes = parseFileSize(size);
    if (bytes === null) return null;
    
    return formatFileSize(bytes, targetUnitType, precision);
}

// Example usage and testing
export const FileSizeUtils = {
    formatFileSize,
    parseFileSize,
    getUnitInfo,
    convertUnitType,
    UNIT_CONFIGS
};
