import React from 'react';
import { FileSystemItem } from '../../shared/ipc-channels';
import { TransferProgress, TransferOptions, TransferInfo } from '../../shared/transfer-types';

/**
 * Advanced transfer manager using fast-transferlib
 * Provides high-performance file operations with progress tracking
 */

export interface TransferManagerCallbacks {
    onProgress?: (transferId: string, progress: TransferProgress) => void;
    onComplete?: (transferId: string, result: any) => void;
    onError?: (transferId: string, error: string) => void;
}

export class TransferManager {
    private static instance: TransferManager;
    private activeTransfers = new Map<string, TransferInfo>();
    private progressCallbacks = new Map<string, TransferManagerCallbacks>();
    private isInitialized = false;
    private rsyncAvailable = false;
    private progressUnsubscribe?: () => void;

    private constructor() {
        this.setupProgressListener();
    }

    static getInstance(): TransferManager {
        if (!TransferManager.instance) {
            TransferManager.instance = new TransferManager();
        }
        return TransferManager.instance;
    }

    private setupProgressListener() {
        // Set up global progress listener
        this.progressUnsubscribe = window.electronAPI.transfer.onProgress((transferId, progress) => {
            const callbacks = this.progressCallbacks.get(transferId);
            const transfer = this.activeTransfers.get(transferId);
            
            if (transfer) {
                transfer.progress = progress;
                transfer.status = 'active';
            }
            
            callbacks?.onProgress?.(transferId, progress);
        });
    }

    async initialize(): Promise<boolean> {
        if (this.isInitialized) {
            return true;
        }

        try {
            const result = await window.electronAPI.transfer.initialize();
            this.isInitialized = result.success;
            this.rsyncAvailable = result.rsyncAvailable || false;
            
            console.log('Transfer system initialized:', {
                success: result.success,
                rsyncAvailable: this.rsyncAvailable,
                providers: result.availableProviders
            });
            
            return this.isInitialized;
        } catch (error) {
            console.error('Failed to initialize transfer system:', error);
            return false;
        }
    }

    /**
     * Copy files using fast-transferlib
     */
    async copyFiles(
        files: FileSystemItem[],
        destination: string,
        options?: TransferOptions,
        callbacks?: TransferManagerCallbacks
    ): Promise<{ success: boolean; transferId: string }> {
        await this.initialize();
        
        const transferId = this.generateTransferId();
        const sources = files.map(f => f.path);

        // Register callbacks
        if (callbacks) {
            this.progressCallbacks.set(transferId, callbacks);
        }

        // Create transfer info
        const transferInfo: TransferInfo = {
            id: transferId,
            type: 'copy',
            source: sources.join(', '),
            destination,
            status: 'queued',
            startTime: Date.now()
        };
        this.activeTransfers.set(transferId, transferInfo);

        try {
            transferInfo.status = 'active';
            const result = await window.electronAPI.transfer.copy(transferId, sources, destination, {
                recursive: true,
                archive: true,
                progress: true,
                ...options
            });

            transferInfo.status = result.success ? 'completed' : 'error';
            transferInfo.endTime = Date.now();
            transferInfo.result = result.results?.[0];

            callbacks?.onComplete?.(transferId, result);
            
            return { success: result.success, transferId };
        } catch (error) {
            transferInfo.status = 'error';
            transferInfo.error = error instanceof Error ? error.message : 'Unknown error';
            transferInfo.endTime = Date.now();
            
            callbacks?.onError?.(transferId, transferInfo.error);
            
            return { success: false, transferId };
        } finally {
            this.progressCallbacks.delete(transferId);
        }
    }

    /**
     * Move files using fast-transferlib
     */
    async moveFiles(
        files: FileSystemItem[],
        destination: string,
        options?: TransferOptions,
        callbacks?: TransferManagerCallbacks
    ): Promise<{ success: boolean; transferId: string }> {
        await this.initialize();
        
        const transferId = this.generateTransferId();
        const sources = files.map(f => f.path);

        if (callbacks) {
            this.progressCallbacks.set(transferId, callbacks);
        }

        const transferInfo: TransferInfo = {
            id: transferId,
            type: 'move',
            source: sources.join(', '),
            destination,
            status: 'queued',
            startTime: Date.now()
        };
        this.activeTransfers.set(transferId, transferInfo);

        try {
            transferInfo.status = 'active';
            const result = await window.electronAPI.transfer.move(transferId, sources, destination, {
                recursive: true,
                archive: true,
                progress: true,
                ...options
            });

            transferInfo.status = result.success ? 'completed' : 'error';
            transferInfo.endTime = Date.now();
            transferInfo.result = result.results?.[0];

            callbacks?.onComplete?.(transferId, result);
            
            return { success: result.success, transferId };
        } catch (error) {
            transferInfo.status = 'error';
            transferInfo.error = error instanceof Error ? error.message : 'Unknown error';
            transferInfo.endTime = Date.now();
            
            callbacks?.onError?.(transferId, transferInfo.error);
            
            return { success: false, transferId };
        } finally {
            this.progressCallbacks.delete(transferId);
        }
    }

    /**
     * Sync directories using fast-transferlib
     */
    async syncDirectories(
        source: string,
        destination: string,
        options?: TransferOptions,
        callbacks?: TransferManagerCallbacks
    ): Promise<{ success: boolean; transferId: string }> {
        await this.initialize();
        
        const transferId = this.generateTransferId();

        if (callbacks) {
            this.progressCallbacks.set(transferId, callbacks);
        }

        const transferInfo: TransferInfo = {
            id: transferId,
            type: 'sync',
            source,
            destination,
            status: 'queued',
            startTime: Date.now()
        };
        this.activeTransfers.set(transferId, transferInfo);

        try {
            transferInfo.status = 'active';
            const result = await window.electronAPI.transfer.sync(transferId, source, destination, {
                recursive: true,
                delete: true,
                archive: true,
                progress: true,
                ...options
            });

            transferInfo.status = result.success ? 'completed' : 'error';
            transferInfo.endTime = Date.now();
            transferInfo.result = result.result;

            callbacks?.onComplete?.(transferId, result);
            
            return { success: result.success, transferId };
        } catch (error) {
            transferInfo.status = 'error';
            transferInfo.error = error instanceof Error ? error.message : 'Unknown error';
            transferInfo.endTime = Date.now();
            
            callbacks?.onError?.(transferId, transferInfo.error);
            
            return { success: false, transferId };
        } finally {
            this.progressCallbacks.delete(transferId);
        }
    }

    /**
     * Cancel an active transfer
     */
    async cancelTransfer(transferId: string): Promise<boolean> {
        try {
            const result = await window.electronAPI.transfer.cancel(transferId);
            const transfer = this.activeTransfers.get(transferId);
            if (transfer) {
                transfer.status = 'cancelled';
                transfer.endTime = Date.now();
            }
            return result.success;
        } catch (error) {
            console.error('Failed to cancel transfer:', error);
            return false;
        }
    }

    /**
     * Get all active transfers
     */
    getActiveTransfers(): TransferInfo[] {
        return Array.from(this.activeTransfers.values()).filter(t => 
            t.status === 'active' || t.status === 'queued'
        );
    }

    /**
     * Get all transfers (including completed)
     */
    getAllTransfers(): TransferInfo[] {
        return Array.from(this.activeTransfers.values());
    }

    /**
     * Get a specific transfer by ID
     */
    getTransfer(transferId: string): TransferInfo | undefined {
        return this.activeTransfers.get(transferId);
    }

    /**
     * Check if rsync is available
     */
    isRsyncAvailable(): boolean {
        return this.rsyncAvailable;
    }

    /**
     * Generate a unique transfer ID
     */
    private generateTransferId(): string {
        return `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.progressUnsubscribe) {
            this.progressUnsubscribe();
        }
        this.activeTransfers.clear();
        this.progressCallbacks.clear();
    }
}

/**
 * React hook for using the transfer manager
 */
export function useTransferManager() {
    const [manager] = React.useState(() => TransferManager.getInstance());
    const [activeTransfers, setActiveTransfers] = React.useState<TransferInfo[]>([]);
    const [isInitialized, setIsInitialized] = React.useState(false);

    React.useEffect(() => {
        manager.initialize().then(setIsInitialized);

        const interval = setInterval(() => {
            setActiveTransfers(manager.getActiveTransfers());
        }, 500);

        return () => {
            clearInterval(interval);
        };
    }, [manager]);

    return {
        manager,
        activeTransfers,
        isInitialized,
        isRsyncAvailable: manager.isRsyncAvailable(),
        copyFiles: manager.copyFiles.bind(manager),
        moveFiles: manager.moveFiles.bind(manager),
        syncDirectories: manager.syncDirectories.bind(manager),
        cancelTransfer: manager.cancelTransfer.bind(manager),
        getAllTransfers: () => manager.getAllTransfers(),
        getTransfer: (id: string) => manager.getTransfer(id)
    };
}
