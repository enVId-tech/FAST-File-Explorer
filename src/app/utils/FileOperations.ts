import React from 'react';
import { FileSystemItem } from '../../shared/ipc-channels';
import { TransferManager, TransferManagerCallbacks } from './TransferManager';

/**
 * Central file operations utilities
 * Provides consistent file operations across all components
 * Now with optional fast-transferlib integration for better performance
 */

export interface FileOperationResult {
    success: boolean;
    error?: string;
    affectedFiles?: string[];
    transferId?: string; // Added for transfer tracking
}

export interface ClipboardState {
    operation: 'copy' | 'cut' | null;
    files: string[];
}

export interface FileOperationCallbacks {
    onSuccess?: (result: FileOperationResult) => void;
    onError?: (error: string) => void;
    onRefresh?: () => void;
    onProgress?: (transferId: string, progress: any) => void; // Added for transfer progress
}

export interface FileOperationOptions {
    useAdvancedTransfer?: boolean; // Use fast-transferlib if available
    showProgress?: boolean; // Show progress UI
}

export class FileOperations {
    /**
     * Copy files to clipboard
     */
    static async copyFiles(files: FileSystemItem[], callbacks?: FileOperationCallbacks, options?: FileOperationOptions): Promise<FileOperationResult> {
        try {
            const paths = files.map(file => file.path);
            await window.electronAPI.clipboard.copyFiles(paths);
            
            // Broadcast clipboard state change
            document.dispatchEvent(new CustomEvent('clipboard-state-changed', {
                detail: { operation: 'copy', files: paths }
            }));

            const result: FileOperationResult = { success: true, affectedFiles: paths };
            callbacks?.onSuccess?.(result);
            
            console.log('Copied files:', paths);
            return result;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to copy files';
            console.error('Failed to copy files:', error);
            callbacks?.onError?.(errorMsg);
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Cut files to clipboard
     */
    static async cutFiles(files: FileSystemItem[], callbacks?: FileOperationCallbacks): Promise<FileOperationResult> {
        try {
            const paths = files.map(file => file.path);
            await window.electronAPI.clipboard.cutFiles(paths);
            
            // Broadcast clipboard state change
            document.dispatchEvent(new CustomEvent('clipboard-state-changed', {
                detail: { operation: 'cut', files: paths }
            }));

            const result: FileOperationResult = { success: true, affectedFiles: paths };
            callbacks?.onSuccess?.(result);
            
            console.log('Cut files:', paths);
            return result;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to cut files';
            console.error('Failed to cut files:', error);
            callbacks?.onError?.(errorMsg);
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Paste files from clipboard to destination
     */
    static async pasteFiles(destinationPath: string, callbacks?: FileOperationCallbacks, options?: FileOperationOptions): Promise<FileOperationResult> {
        try {
            // Try to use advanced transfer if enabled
            if (options?.useAdvancedTransfer) {
                try {
                    const transferManager = TransferManager.getInstance();
                    await transferManager.initialize();

                    // Get clipboard state to know what to paste
                    const clipboardState = await window.electronAPI.clipboard.getState();
                    
                    if (clipboardState.files.length > 0) {
                        const fileItems: FileSystemItem[] = clipboardState.files.map(path => ({
                            path,
                            name: path.split(/[/\\]/).pop() || '',
                            type: 'file' as const,
                            size: 0,
                            modified: new Date(),
                            created: new Date(),
                            isHidden: false,
                            isSystem: false,
                            permissions: { read: true, write: true, execute: false }
                        }));

                        const transferCallbacks: TransferManagerCallbacks = {
                            onProgress: callbacks?.onProgress,
                            onComplete: (transferId, result) => {
                                callbacks?.onSuccess?.({ success: result.success, transferId });
                                callbacks?.onRefresh?.();
                            },
                            onError: (transferId, error) => {
                                callbacks?.onError?.(error);
                            }
                        };

                        if (clipboardState.operation === 'copy') {
                            const result = await transferManager.copyFiles(fileItems, destinationPath, {}, transferCallbacks);
                            
                            if (result.success) {
                                // Clear clipboard after successful paste
                                await window.electronAPI.clipboard.clear();
                            }
                            
                            return { 
                                success: result.success, 
                                transferId: result.transferId,
                                affectedFiles: clipboardState.files 
                            };
                        } else if (clipboardState.operation === 'cut') {
                            const result = await transferManager.moveFiles(fileItems, destinationPath, {}, transferCallbacks);
                            
                            if (result.success) {
                                await window.electronAPI.clipboard.clear();
                            }
                            
                            return { 
                                success: result.success, 
                                transferId: result.transferId,
                                affectedFiles: clipboardState.files 
                            };
                        }
                    }
                } catch (transferError) {
                    console.warn('Advanced transfer failed, falling back to standard paste:', transferError);
                    // Fall through to standard paste
                }
            }

            // Standard paste operation
            const success = await window.electronAPI.clipboard.pasteFiles(destinationPath);
            
            if (success) {
                // Clear clipboard state
                document.dispatchEvent(new CustomEvent('clipboard-state-changed', {
                    detail: { operation: null, files: [] }
                }));

                const result: FileOperationResult = { success: true };
                callbacks?.onSuccess?.(result);
                callbacks?.onRefresh?.();
                
                console.log('Pasted files to:', destinationPath);
                return result;
            } else {
                throw new Error('Paste operation failed');
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to paste files';
            console.error('Failed to paste files:', error);
            callbacks?.onError?.(errorMsg);
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Delete files
     */
    static async deleteFiles(files: FileSystemItem[], callbacks?: FileOperationCallbacks): Promise<FileOperationResult> {
        try {
            const paths = files.map(file => file.path);
            await window.electronAPI.files.delete(paths);

            const result: FileOperationResult = { success: true, affectedFiles: paths };
            callbacks?.onSuccess?.(result);
            callbacks?.onRefresh?.();
            
            console.log('Deleted files:', paths);
            return result;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to delete files';
            console.error('Failed to delete files:', error);
            callbacks?.onError?.(errorMsg);
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Rename a file
     */
    static async renameFile(file: FileSystemItem, newName: string, callbacks?: FileOperationCallbacks): Promise<FileOperationResult> {
        try {
            await window.electronAPI.files.rename(file.path, newName);

            const result: FileOperationResult = { success: true, affectedFiles: [file.path] };
            callbacks?.onSuccess?.(result);
            callbacks?.onRefresh?.();
            
            console.log('Renamed file:', file.path, 'to', newName);
            return result;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to rename file';
            console.error('Failed to rename file:', error);
            callbacks?.onError?.(errorMsg);
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Create a new folder
     */
    static async createFolder(parentPath: string, folderName: string, callbacks?: FileOperationCallbacks): Promise<FileOperationResult> {
        try {
            const newPath = await window.electronAPI.files.createFolder(parentPath, folderName);

            const result: FileOperationResult = { success: true, affectedFiles: [newPath] };
            callbacks?.onSuccess?.(result);
            callbacks?.onRefresh?.();
            
            console.log('Created folder:', folderName, 'in', parentPath);
            return result;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to create folder';
            console.error('Failed to create folder:', error);
            callbacks?.onError?.(errorMsg);
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Open a file
     */
    static async openFile(file: FileSystemItem, useFastOpen = true): Promise<FileOperationResult> {
        try {
            if (useFastOpen) {
                // Fire-and-forget for maximum speed
                window.electronAPI.system.openFileFast(file.path);
            } else {
                // Wait for confirmation
                await window.electronAPI.system.openFile(file.path);
            }

            console.log('Opened file:', file.path);
            return { success: true, affectedFiles: [file.path] };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to open file';
            console.error('Failed to open file:', error);
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Show file properties
     */
    static async showProperties(file: FileSystemItem): Promise<FileOperationResult> {
        try {
            await window.electronAPI.files.showProperties(file.path);
            console.log('Showed properties for:', file.path);
            return { success: true, affectedFiles: [file.path] };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to show properties';
            console.error('Failed to show properties:', error);
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Show file in system explorer
     */
    static async showInExplorer(file: FileSystemItem): Promise<FileOperationResult> {
        try {
            await window.electronAPI.files.showInExplorer(file.path);
            console.log('Showed in explorer:', file.path);
            return { success: true, affectedFiles: [file.path] };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to show in explorer';
            console.error('Failed to show in explorer:', error);
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Get clipboard state
     */
    static async getClipboardState(): Promise<ClipboardState> {
        try {
            return await window.electronAPI.clipboard.getState();
        } catch (error) {
            console.error('Failed to get clipboard state:', error);
            return { operation: null, files: [] };
        }
    }

    /**
     * Check if clipboard has files
     */
    static async hasClipboardFiles(): Promise<boolean> {
        try {
            return await window.electronAPI.clipboard.hasFiles();
        } catch (error) {
            console.error('Failed to check clipboard state:', error);
            return false;
        }
    }

    /**
     * Clear clipboard
     */
    static async clearClipboard(): Promise<void> {
        try {
            await window.electronAPI.clipboard.clear();
            document.dispatchEvent(new CustomEvent('clipboard-state-changed', {
                detail: { operation: null, files: [] }
            }));
        } catch (error) {
            console.error('Failed to clear clipboard:', error);
        }
    }
}

/**
 * React hook for file operations with state management
 */
export function useFileOperations(onRefresh?: () => void) {
    const [clipboardState, setClipboardState] = React.useState<ClipboardState>({ operation: null, files: [] });
    const [isLoading, setIsLoading] = React.useState(false);

    // Listen for clipboard changes
    React.useEffect(() => {
        const handleClipboardChange = (event: CustomEvent) => {
            setClipboardState({
                operation: event.detail.operation,
                files: event.detail.files
            });
        };

        // Load initial clipboard state
        FileOperations.getClipboardState().then(setClipboardState);

        document.addEventListener('clipboard-state-changed', handleClipboardChange as EventListener);
        return () => {
            document.removeEventListener('clipboard-state-changed', handleClipboardChange as EventListener);
        };
    }, []);

    const createCallbacks = React.useCallback((customCallbacks?: FileOperationCallbacks): FileOperationCallbacks => ({
        onSuccess: (result) => {
            setIsLoading(false);
            customCallbacks?.onSuccess?.(result);
        },
        onError: (error) => {
            setIsLoading(false);
            customCallbacks?.onError?.(error);
        },
        onRefresh: () => {
            onRefresh?.();
            customCallbacks?.onRefresh?.();
        }
    }), [onRefresh]);

    const copyFiles = React.useCallback(async (files: FileSystemItem[], callbacks?: FileOperationCallbacks) => {
        setIsLoading(true);
        return await FileOperations.copyFiles(files, createCallbacks(callbacks));
    }, [createCallbacks]);

    const cutFiles = React.useCallback(async (files: FileSystemItem[], callbacks?: FileOperationCallbacks) => {
        setIsLoading(true);
        return await FileOperations.cutFiles(files, createCallbacks(callbacks));
    }, [createCallbacks]);

    const pasteFiles = React.useCallback(async (destinationPath: string, callbacks?: FileOperationCallbacks) => {
        setIsLoading(true);
        return await FileOperations.pasteFiles(destinationPath, createCallbacks(callbacks));
    }, [createCallbacks]);

    const deleteFiles = React.useCallback(async (files: FileSystemItem[], callbacks?: FileOperationCallbacks) => {
        setIsLoading(true);
        return await FileOperations.deleteFiles(files, createCallbacks(callbacks));
    }, [createCallbacks]);

    const renameFile = React.useCallback(async (file: FileSystemItem, newName: string, callbacks?: FileOperationCallbacks) => {
        setIsLoading(true);
        return await FileOperations.renameFile(file, newName, createCallbacks(callbacks));
    }, [createCallbacks]);

    const createFolder = React.useCallback(async (parentPath: string, folderName: string, callbacks?: FileOperationCallbacks) => {
        setIsLoading(true);
        return await FileOperations.createFolder(parentPath, folderName, createCallbacks(callbacks));
    }, [createCallbacks]);

    return {
        // State
        clipboardState,
        isLoading,
        hasClipboardFiles: clipboardState.files.length > 0,
        
        // Operations
        copyFiles,
        cutFiles,
        pasteFiles,
        deleteFiles,
        renameFile,
        createFolder,
        openFile: FileOperations.openFile,
        showProperties: FileOperations.showProperties,
        showInExplorer: FileOperations.showInExplorer,
        clearClipboard: FileOperations.clearClipboard
    };
}
