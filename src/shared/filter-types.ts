// Filter and search interfaces for the file explorer

export interface FilterCriteria {
    query: string;
    caseSensitive: boolean;
    dateRange: {
        start: string;
        end: string;
    };
    sizeRange: {
        min: string;
        max: string;
    };
    selectedFileTypes: string[];
}

export interface SearchScope {
    scope: 'current' | 'global';
    currentPath?: string;
}

export interface AdvancedSearchState {
    isVisible: boolean;
    scope: SearchScope;
    filters: FilterCriteria;
}

export const COMMON_FILE_TYPES = [
    'Documents', 'Images', 'Videos', 'Audio', 'Archives', 'Code'
] as const;

export type CommonFileType = typeof COMMON_FILE_TYPES[number];

export const FILE_TYPE_EXTENSIONS: Record<CommonFileType, string[]> = {
    'Documents': ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.xls', '.xlsx', '.ppt', '.pptx'],
    'Images': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.tiff', '.webp', '.ico'],
    'Videos': ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v'],
    'Audio': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'],
    'Archives': ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'],
    'Code': ['.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.scss', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.go', '.rs', '.json', '.xml', '.yml', '.yaml']
};

export interface FilterUIState {
    showFilters: boolean;
    activeFilters: number;
}

// Helper function to count active filters
export function countActiveFilters(filters: FilterCriteria): number {
    let count = 0;

    if (filters.query.trim()) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.sizeRange.min || filters.sizeRange.max) count++;
    if (filters.selectedFileTypes.length > 0) count++;
    if (filters.caseSensitive) count++;

    return count;
}

// Helper function to check if a file matches file type filter
export function matchesFileType(fileName: string, selectedTypes: string[]): boolean {
    if (selectedTypes.length === 0) return true;

    const extension = '.' + fileName.split('.').pop()?.toLowerCase();

    return selectedTypes.some(type => {
        const extensions = FILE_TYPE_EXTENSIONS[type as CommonFileType];
        return extensions?.includes(extension);
    });
}

// Helper function to parse size string (e.g., "100KB", "1.5MB")
export function parseSizeString(sizeStr: string): number {
    if (!sizeStr.trim()) return 0;

    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB|B)?$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = (match[2] || 'B').toUpperCase();

    switch (unit) {
        case 'B': return value;
        case 'KB': return value * 1024;
        case 'MB': return value * 1024 * 1024;
        case 'GB': return value * 1024 * 1024 * 1024;
        default: return value;
    }
}

// Default filter criteria
export const defaultFilterCriteria: FilterCriteria = {
    query: '',
    caseSensitive: false,
    dateRange: { start: '', end: '' },
    sizeRange: { min: '', max: '' },
    selectedFileTypes: []
};
