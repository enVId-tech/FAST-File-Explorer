/**
 * BatchRenameManager - Manages batch file/folder renaming operations
 * 
 * Features:
 * - Pattern-based renaming
 * - Find and replace
 * - Numbering sequences
 * - Case conversion
 * - Date/time insertion
 * - Prefix/suffix addition
 * - Preview before applying
 * - Undo functionality
 * - Validation and conflict detection
 * 
 * @module BatchRenameManager
 */

import { FileSystemItem } from '../../shared/ipc-channels';

export type RenamePattern = 
    | 'find-replace'
    | 'numbering'
    | 'case-conversion'
    | 'prefix-suffix'
    | 'date-time'
    | 'remove-text'
    | 'custom-pattern';

export interface RenameOperation {
    id: string;
    pattern: RenamePattern;
    options: RenameOptions;
    items: FileSystemItem[];
    preview: RenamePreview[];
    timestamp: number;
}

export interface RenameOptions {
    // Find-Replace
    findText?: string;
    replaceText?: string;
    caseSensitive?: boolean;
    useRegex?: boolean;
    matchCase?: boolean; // Alias for caseSensitive
    
    // Numbering
    startNumber?: number;
    numberPadding?: number;
    padding?: number; // Alias for numberPadding
    numberPosition?: 'prefix' | 'suffix';
    position?: 'prefix' | 'suffix'; // Alias for numberPosition/datePosition
    numberFormat?: string; // e.g., "###", "(###)", "[###]"
    separator?: string; // Separator between number and name
    
    // Case Conversion
    caseType?: 'upper' | 'lower' | 'title' | 'camel' | 'pascal' | 'uppercase' | 'lowercase' | 'titlecase' | 'camelcase' | 'pascalcase';
    
    // Prefix/Suffix
    prefix?: string;
    suffix?: string;
    
    // Date/Time
    dateFormat?: string; // e.g., "YYYY-MM-DD", "DD-MM-YYYY"
    datePosition?: 'prefix' | 'suffix';
    
    // Remove Text
    removePattern?: string;
    removeFrom?: 'start' | 'end' | 'all';
    removeType?: 'start' | 'end' | 'all'; // Alias for removeFrom
    removeCount?: number;
    charCount?: number; // Alias for removeCount
    text?: string; // Text to remove
    
    // Custom Pattern
    customPattern?: string; // e.g., "{name}_{date}_{counter}"
    
    // General
    includeExtension?: boolean;
    applyToFolders?: boolean;
    applyToFiles?: boolean;
}

export interface RenamePreview {
    item: FileSystemItem;
    originalName: string;
    newName: string;
    hasConflict: boolean;
    conflictWith?: string;
    error?: string;
}

export interface UndoEntry {
    id: string;
    timestamp: number;
    operations: Array<{
        path: string;
        oldName: string;
        newName: string;
    }>;
}

class BatchRenameManagerClass {
    private operations: RenameOperation[] = [];
    private undoHistory: UndoEntry[] = [];
    private maxUndoHistory: number = 50;

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `rename_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Create rename preview
     */
    public createPreview(
        items: FileSystemItem[],
        pattern: RenamePattern,
        options: RenameOptions
    ): RenamePreview[] {
        const previews: RenamePreview[] = [];
        const newNames: Set<string> = new Set();

        items.forEach((item, index) => {
            // Check if should process this item
            const shouldProcess = this.shouldProcessItem(item, options);
            if (!shouldProcess) {
                previews.push({
                    item,
                    originalName: item.name,
                    newName: item.name,
                    hasConflict: false,
                    error: 'Skipped based on filter settings'
                });
                return;
            }

            try {
                const newName = this.applyPattern(item, pattern, options, index);
                const hasConflict = newNames.has(newName.toLowerCase());
                
                previews.push({
                    item,
                    originalName: item.name,
                    newName,
                    hasConflict,
                    conflictWith: hasConflict ? newName : undefined
                });

                newNames.add(newName.toLowerCase());
            } catch (error) {
                previews.push({
                    item,
                    originalName: item.name,
                    newName: item.name,
                    hasConflict: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        return previews;
    }

    /**
     * Check if item should be processed based on options
     */
    private shouldProcessItem(item: FileSystemItem, options: RenameOptions): boolean {
        if (item.type === 'directory' && !options.applyToFolders) return false;
        if (item.type === 'file' && !options.applyToFiles) return false;
        return true;
    }

    /**
     * Apply rename pattern to item
     */
    private applyPattern(
        item: FileSystemItem,
        pattern: RenamePattern,
        options: RenameOptions,
        index: number
    ): string {
        const { name: originalName, extension } = this.splitNameExtension(item);
        let newName = originalName;

        switch (pattern) {
            case 'find-replace':
                newName = this.applyFindReplace(newName, options);
                break;
            
            case 'numbering':
                newName = this.applyNumbering(newName, options, index);
                break;
            
            case 'case-conversion':
                newName = this.applyCaseConversion(newName, options);
                break;
            
            case 'prefix-suffix':
                newName = this.applyPrefixSuffix(newName, options);
                break;
            
            case 'date-time':
                newName = this.applyDateTime(newName, options);
                break;
            
            case 'remove-text':
                newName = this.applyRemoveText(newName, options);
                break;
            
            case 'custom-pattern':
                newName = this.applyCustomPattern(newName, options, index);
                break;
        }

        // Add extension back if not including in rename
        if (!options.includeExtension && extension) {
            return `${newName}${extension}`;
        }

        return newName;
    }

    /**
     * Split filename into name and extension
     */
    private splitNameExtension(item: FileSystemItem): { name: string; extension: string } {
        if (item.type === 'directory') {
            return { name: item.name, extension: '' };
        }

        const lastDot = item.name.lastIndexOf('.');
        if (lastDot === -1 || lastDot === 0) {
            return { name: item.name, extension: '' };
        }

        return {
            name: item.name.substring(0, lastDot),
            extension: item.name.substring(lastDot)
        };
    }

    /**
     * Apply find-replace pattern
     */
    private applyFindReplace(name: string, options: RenameOptions): string {
        const { findText = '', replaceText = '', caseSensitive = false, useRegex = false } = options;

        if (!findText) return name;

        if (useRegex) {
            try {
                const flags = caseSensitive ? 'g' : 'gi';
                const regex = new RegExp(findText, flags);
                return name.replace(regex, replaceText);
            } catch (error) {
                throw new Error('Invalid regex pattern');
            }
        } else {
            if (caseSensitive) {
                return name.split(findText).join(replaceText);
            } else {
                const regex = new RegExp(this.escapeRegex(findText), 'gi');
                return name.replace(regex, replaceText);
            }
        }
    }

    /**
     * Escape special regex characters
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Apply numbering pattern
     */
    private applyNumbering(name: string, options: RenameOptions, index: number): string {
        const {
            startNumber = 1,
            numberPadding = 3,
            numberPosition = 'suffix',
            numberFormat = '###'
        } = options;

        const number = startNumber + index;
        const paddedNumber = number.toString().padStart(numberPadding, '0');
        const formattedNumber = numberFormat.replace(/#+/g, paddedNumber);

        if (numberPosition === 'prefix') {
            return `${formattedNumber} ${name}`;
        } else {
            return `${name} ${formattedNumber}`;
        }
    }

    /**
     * Apply case conversion
     */
    private applyCaseConversion(name: string, options: RenameOptions): string {
        const { caseType = 'lowercase' } = options;

        switch (caseType) {
            case 'uppercase':
                return name.toUpperCase();
            
            case 'lowercase':
                return name.toLowerCase();
            
            case 'titlecase':
                return name.replace(/\b\w/g, char => char.toUpperCase());
            
            case 'camelcase':
                return name
                    .toLowerCase()
                    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase());
            
            case 'pascalcase':
                const camel = name
                    .toLowerCase()
                    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase());
                return camel.charAt(0).toUpperCase() + camel.slice(1);
            
            default:
                return name;
        }
    }

    /**
     * Apply prefix/suffix
     */
    private applyPrefixSuffix(name: string, options: RenameOptions): string {
        const { prefix = '', suffix = '' } = options;
        return `${prefix}${name}${suffix}`;
    }

    /**
     * Apply date/time insertion
     */
    private applyDateTime(name: string, options: RenameOptions): string {
        const { dateFormat = 'YYYY-MM-DD', datePosition = 'suffix' } = options;
        const now = new Date();
        const formatted = this.formatDate(now, dateFormat);

        if (datePosition === 'prefix') {
            return `${formatted} ${name}`;
        } else {
            return `${name} ${formatted}`;
        }
    }

    /**
     * Format date according to pattern
     */
    private formatDate(date: Date, format: string): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', String(year))
            .replace('YY', String(year).slice(-2))
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    /**
     * Apply remove text pattern
     */
    private applyRemoveText(name: string, options: RenameOptions): string {
        const { removePattern = '', removeFrom = 'all', removeCount = 1 } = options;

        if (!removePattern) return name;

        switch (removeFrom) {
            case 'start':
                if (name.startsWith(removePattern)) {
                    return name.substring(removePattern.length);
                }
                return name;
            
            case 'end':
                if (name.endsWith(removePattern)) {
                    return name.substring(0, name.length - removePattern.length);
                }
                return name;
            
            case 'all':
                return name.split(removePattern).join('');
            
            default:
                return name;
        }
    }

    /**
     * Apply custom pattern
     */
    private applyCustomPattern(name: string, options: RenameOptions, index: number): string {
        const { customPattern = '{name}', startNumber = 1 } = options;
        const now = new Date();

        return customPattern
            .replace('{name}', name)
            .replace('{counter}', String(startNumber + index))
            .replace('{date}', this.formatDate(now, 'YYYY-MM-DD'))
            .replace('{time}', this.formatDate(now, 'HH-mm-ss'))
            .replace('{year}', String(now.getFullYear()))
            .replace('{month}', String(now.getMonth() + 1).padStart(2, '0'))
            .replace('{day}', String(now.getDate()).padStart(2, '0'));
    }

    /**
     * Validate previews for conflicts
     */
    public validatePreviews(previews: RenamePreview[]): {
        valid: boolean;
        errors: string[];
        conflicts: Map<string, string[]>;
    } {
        const errors: string[] = [];
        const conflicts = new Map<string, string[]>();

        // Group conflicts by new name
        const nameCount = new Map<string, string[]>();
        previews.forEach(preview => {
            if (!nameCount.has(preview.newName.toLowerCase())) {
                nameCount.set(preview.newName.toLowerCase(), []);
            }
            nameCount.get(preview.newName.toLowerCase())!.push(preview.originalName);
        });

        // Find conflicts (multiple files with same new name)
        nameCount.forEach((originalNames, newName) => {
            if (originalNames.length > 1) {
                conflicts.set(newName, originalNames);
            }
        });

        // Check for preview errors
        previews.forEach(preview => {
            if (preview.error) {
                errors.push(`${preview.originalName}: ${preview.error}`);
            }
        });

        // Check for empty names
        const emptyNames = previews.filter(p => !p.newName.trim());
        if (emptyNames.length > 0) {
            errors.push(`${emptyNames.length} file(s) would have empty names`);
        }

        // Check for invalid characters
        const invalidChars = /[<>:"/\\|?*]/;
        const invalidNames = previews.filter(p => invalidChars.test(p.newName));
        if (invalidNames.length > 0) {
            errors.push(`${invalidNames.length} file(s) contain invalid characters`);
        }

        return {
            valid: errors.length === 0 && conflicts.size === 0,
            errors,
            conflicts
        };
    }

    /**
     * Execute rename operation
     */
    public async executeRename(
        previews: RenamePreview[]
    ): Promise<{ success: boolean; errors: string[]; renamed: number }> {
        const errors: string[] = [];
        let renamed = 0;
        const undoOperations: Array<{ path: string; oldName: string; newName: string }> = [];

        // Filter out items with errors or conflicts
        const validPreviews = previews.filter(p => !p.error && !p.hasConflict);

        for (const preview of validPreviews) {
            try {
                const oldPath = preview.item.path;
                const parentPath = this.getParentPath(oldPath);

                // Call electron API to rename (newName only, not full path)
                await window.electronAPI.files.rename(oldPath, preview.newName);

                undoOperations.push({
                    path: parentPath,
                    oldName: preview.originalName,
                    newName: preview.newName
                });

                renamed++;
            } catch (error) {
                errors.push(
                    `Failed to rename ${preview.originalName}: ${
                        error instanceof Error ? error.message : 'Unknown error'
                    }`
                );
            }
        }

        // Save undo entry
        if (undoOperations.length > 0) {
            this.saveUndoEntry(undoOperations);
        }

        return {
            success: errors.length === 0,
            errors,
            renamed
        };
    }

    /**
     * Get parent path from full path
     */
    private getParentPath(fullPath: string): string {
        const parts = fullPath.split(/[\\/]/);
        parts.pop();
        return parts.join('\\');
    }

    /**
     * Save undo entry
     */
    private saveUndoEntry(operations: Array<{ path: string; oldName: string; newName: string }>): void {
        const entry: UndoEntry = {
            id: this.generateId(),
            timestamp: Date.now(),
            operations
        };

        this.undoHistory.unshift(entry);

        // Trim history if too long
        if (this.undoHistory.length > this.maxUndoHistory) {
            this.undoHistory = this.undoHistory.slice(0, this.maxUndoHistory);
        }
    }

    /**
     * Get undo history
     */
    public getUndoHistory(): UndoEntry[] {
        return [...this.undoHistory];
    }

    /**
     * Undo last rename operation
     */
    public async undoLastRename(): Promise<{ success: boolean; errors: string[]; undone: number }> {
        if (this.undoHistory.length === 0) {
            return { success: false, errors: ['No operations to undo'], undone: 0 };
        }

        const entry = this.undoHistory.shift()!;
        const errors: string[] = [];
        let undone = 0;

        // Reverse the operations (rename back to original)
        for (const op of entry.operations.reverse()) {
            try {
                const currentPath = `${op.path}\\${op.newName}`;
                
                // Call electron API to rename back (oldName only, not full path)
                await window.electronAPI.files.rename(currentPath, op.oldName);
                undone++;
            } catch (error) {
                errors.push(
                    `Failed to undo rename of ${op.newName}: ${
                        error instanceof Error ? error.message : 'Unknown error'
                    }`
                );
            }
        }

        return {
            success: errors.length === 0,
            errors,
            undone
        };
    }

    /**
     * Clear undo history
     */
    public clearUndoHistory(): void {
        this.undoHistory = [];
    }

    /**
     * Check if undo is available
     */
    public canUndo(): boolean {
        return this.undoHistory.length > 0;
    }

    /**
     * Get rename suggestions based on common patterns
     */
    public getSuggestions(items: FileSystemItem[]): Array<{
        name: string;
        description: string;
        pattern: RenamePattern;
        options: RenameOptions;
    }> {
        return [
            {
                name: 'Add Sequential Numbers',
                description: 'Add sequential numbers to filenames',
                pattern: 'numbering',
                options: { startNumber: 1, numberPadding: 3, numberPosition: 'suffix' }
            },
            {
                name: 'Convert to Lowercase',
                description: 'Convert all filenames to lowercase',
                pattern: 'case-conversion',
                options: { caseType: 'lowercase' }
            },
            {
                name: 'Add Current Date',
                description: 'Add current date to filenames',
                pattern: 'date-time',
                options: { dateFormat: 'YYYY-MM-DD', datePosition: 'prefix' }
            },
            {
                name: 'Remove Spaces',
                description: 'Remove spaces from filenames',
                pattern: 'find-replace',
                options: { findText: ' ', replaceText: '_' }
            }
        ];
    }
}

// Export singleton instance
export const batchRenameManager = new BatchRenameManagerClass();
