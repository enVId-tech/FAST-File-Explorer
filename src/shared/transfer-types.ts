/**
 * Transfer-related type definitions for fast-transferlib integration
 */

export interface TransferProgress {
    bytesTransferred: number;
    totalBytes: number;
    filesTransferred: number;
    totalFiles: number;
    currentFile: string;
    transferRate: string;
    timeRemaining?: string;
    percentage: number;
}

export interface TransferOptions {
    // Common options
    archive?: boolean;
    verbose?: boolean;
    compress?: boolean;
    delete?: boolean;
    dryRun?: boolean;
    exclude?: string[];
    include?: string[];
    progress?: boolean;
    recursive?: boolean;
    preserveLinks?: boolean;
    preservePerms?: boolean;
    preserveTimes?: boolean;
    checksum?: boolean;
    
    // Network/remote options
    bandwidth?: number;
    timeout?: number;
    retries?: number;
    
    // Authentication
    username?: string;
    password?: string;
    keyFile?: string;
    
    // Unified Transfer Manager options
    preferRsync?: boolean;
    forceNative?: boolean;
    preferredMethod?: string;
    allowNetworkFallback?: boolean;
}

export interface TransferResult {
    success: boolean;
    exitCode: number;
    output: string;
    error?: string;
    bytesTransferred?: number;
    filesTransferred?: number;
    duration?: number;
    sourceSize?: number;
    transferRate?: string;
    method: 'rsync' | 'robocopy' | 'xcopy' | 'cp' | 'ditto' | 'tar' | 'scp' | 'smb' | 'unknown';
    fallbackUsed: boolean;
}

export interface TransferInfo {
    id: string;
    type: 'copy' | 'move' | 'sync';
    source: string;
    destination: string;
    status: 'queued' | 'active' | 'paused' | 'completed' | 'error' | 'cancelled';
    progress?: TransferProgress;
    result?: TransferResult;
    startTime: number;
    endTime?: number;
    error?: string;
}
