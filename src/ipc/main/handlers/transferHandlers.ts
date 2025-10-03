import { ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { TransferProgress, TransferOptions as LocalTransferOptions } from '../../../shared/transfer-types';

// Import fast-transferlib types with proper handling
type UnifiedTransferManager = any;
type TransferResult = any;
type TransferOptions = any;

// Dynamically import fast-transferlib to avoid compile-time errors
let UnifiedTransferManagerClass: any;
let transferLibLoaded = false;

async function loadTransferLib() {
    if (!transferLibLoaded) {
        try {
            const lib = await import('fast-transferlib');
            UnifiedTransferManagerClass = lib.UnifiedTransferManager;
            transferLibLoaded = true;
        } catch (error) {
            console.error('Failed to load fast-transferlib:', error);
        }
    }
    return transferLibLoaded;
}

/**
 * Advanced file transfer handlers using fast-transferlib
 * Provides high-performance file operations with progress tracking
 */

interface ActiveTransfer {
    id: string;
    manager: any;
    source: string;
    destination: string;
    options: LocalTransferOptions;
    startTime: number;
}

const activeTransfers = new Map<string, ActiveTransfer>();

export function registerTransferHandlers(): void {
    console.log('Registering fast-transferlib handlers...');

    /**
     * Initialize transfer system and check capabilities
     */
    ipcMain.handle('transfer-initialize', async () => {
        try {
            await loadTransferLib();
            if (!transferLibLoaded) {
                return {
                    success: false,
                    error: 'fast-transferlib not available'
                };
            }

            const manager = new UnifiedTransferManagerClass();
            await manager.initialize();
            
            return {
                success: true,
                rsyncAvailable: (manager as any).rsyncAvailable,
                availableProviders: Array.from((manager as any).availableProviders.keys())
            };
        } catch (error) {
            console.error('Failed to initialize transfer system:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    });

    /**
     * Start a file transfer operation with progress tracking
     */
    ipcMain.handle('transfer-start', async (event, transferId: string, sources: string[], destination: string, options?: LocalTransferOptions) => {
        try {
            await loadTransferLib();
            if (!transferLibLoaded) {
                throw new Error('fast-transferlib not available');
            }

            const manager = new UnifiedTransferManagerClass();
            await manager.initialize();

            const window = BrowserWindow.fromWebContents(event.sender);
            if (!window) {
                throw new Error('Could not find browser window');
            }

            // Set up progress tracking
            manager.on('progress', (progress: TransferProgress) => {
                window.webContents.send('transfer-progress', transferId, progress);
            });

            // Store active transfer
            activeTransfers.set(transferId, {
                id: transferId,
                manager,
                source: sources.join(', '),
                destination,
                options: options || {},
                startTime: Date.now()
            });

            // Start transfer for each source
            const results: TransferResult[] = [];
            
            for (const source of sources) {
                const result = await manager.transfer(source, destination, {
                    recursive: true,
                    progress: true,
                    verbose: true,
                    ...options
                });
                results.push(result);
            }

            // Clean up
            activeTransfers.delete(transferId);

            // Calculate totals
            const totalBytes = results.reduce((sum, r) => sum + (r.bytesTransferred || 0), 0);
            const allSuccessful = results.every(r => r.success);

            return {
                success: allSuccessful,
                results,
                totalBytesTransferred: totalBytes,
                duration: Date.now() - (activeTransfers.get(transferId)?.startTime || Date.now())
            };
        } catch (error) {
            activeTransfers.delete(transferId);
            console.error('Transfer failed:', error);
            throw error;
        }
    });

    /**
     * Copy files using fast-transferlib
     */
    ipcMain.handle('transfer-copy', async (event, transferId: string, sources: string[], destination: string, options?: LocalTransferOptions) => {
        await loadTransferLib();
        if (!transferLibLoaded) {
            throw new Error('fast-transferlib not available');
        }

        const manager = new UnifiedTransferManagerClass();
        await manager.initialize();

        const window = BrowserWindow.fromWebContents(event.sender);
        if (window) {
            manager.on('progress', (progress: TransferProgress) => {
                window.webContents.send('transfer-progress', transferId, progress);
            });
        }

        const results: TransferResult[] = [];
        for (const source of sources) {
            const result = await manager.transfer(source, destination, {
                archive: true,
                recursive: true,
                progress: true,
                ...options
            });
            results.push(result);
        }

        return {
            success: results.every((r: any) => r.success),
            results
        };
    });

    /**
     * Move files using fast-transferlib (copy + delete source)
     */
    ipcMain.handle('transfer-move', async (event, transferId: string, sources: string[], destination: string, options?: LocalTransferOptions) => {
        try {
            await loadTransferLib();
            if (!transferLibLoaded) {
                throw new Error('fast-transferlib not available');
            }

            const manager = new UnifiedTransferManagerClass();
            await manager.initialize();

            const window = BrowserWindow.fromWebContents(event.sender);
            if (!window) {
                throw new Error('Could not find browser window');
            }

            // Set up progress tracking
            manager.on('progress', (progress: TransferProgress) => {
                window.webContents.send('transfer-progress', transferId, progress);
            });

            const results: TransferResult[] = [];
            
            for (const source of sources) {
                // Copy first
                const result = await manager.transfer(source, destination, {
                    recursive: true,
                    progress: true,
                    archive: true,
                    ...options
                });
                results.push(result);

                // Delete source if copy succeeded
                if (result.success) {
                    const stat = await fs.stat(source);
                    if (stat.isDirectory()) {
                        await fs.rm(source, { recursive: true });
                    } else {
                        await fs.unlink(source);
                    }
                }
            }

            const allSuccessful = results.every(r => r.success);

            return {
                success: allSuccessful,
                results,
                totalBytesTransferred: results.reduce((sum, r) => sum + (r.bytesTransferred || 0), 0)
            };
        } catch (error) {
            console.error('Move operation failed:', error);
            throw error;
        }
    });

    /**
     * Sync directories using fast-transferlib
     */
    ipcMain.handle('transfer-sync', async (event, transferId: string, source: string, destination: string, options?: LocalTransferOptions) => {
        try {
            await loadTransferLib();
            if (!transferLibLoaded) {
                throw new Error('fast-transferlib not available');
            }

            const manager = new UnifiedTransferManagerClass();
            await manager.initialize();

            const window = BrowserWindow.fromWebContents(event.sender);
            if (!window) {
                throw new Error('Could not find browser window');
            }

            manager.on('progress', (progress: TransferProgress) => {
                window.webContents.send('transfer-progress', transferId, progress);
            });

            const result = await manager.transfer(source, destination, {
                recursive: true,
                delete: true,  // Delete files in destination not in source
                progress: true,
                archive: true,
                ...options
            });

            return {
                success: result.success,
                result
            };
        } catch (error) {
            console.error('Sync operation failed:', error);
            throw error;
        }
    });

    /**
     * Cancel an active transfer
     */
    ipcMain.handle('transfer-cancel', async (event, transferId: string) => {
        const transfer = activeTransfers.get(transferId);
        if (transfer) {
            // Note: The UnifiedTransferManager doesn't have a built-in cancel method
            // We'll need to track the process and kill it manually
            activeTransfers.delete(transferId);
            return { success: true };
        }
        return { success: false, error: 'Transfer not found' };
    });

    /**
     * Get active transfers
     */
    ipcMain.handle('transfer-get-active', async () => {
        return Array.from(activeTransfers.values()).map(t => ({
            id: t.id,
            source: t.source,
            destination: t.destination,
            startTime: t.startTime
        }));
    });
}
