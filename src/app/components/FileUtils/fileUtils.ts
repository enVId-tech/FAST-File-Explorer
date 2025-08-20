/**
 * Windows-style natural sorting utility for file names
 * This handles numbers within strings properly (e.g., "file10.txt" comes after "file2.txt")
 */
export const windowsNaturalSort = (a: string, b: string): number => {
    // Windows File Explorer uses natural sorting (alphanumeric)
    return a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: 'base', // Case-insensitive
        ignorePunctuation: false
    });
};

// Enhanced sorting type definitions
export type SortField = 'name' | 'size' | 'modified' | 'type';
export type SortDirection = 'asc' | 'desc';

export interface SortState {
    field: SortField;
    direction: SortDirection;
}
