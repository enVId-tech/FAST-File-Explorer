/**
 * Type declarations for fast-transferlib
 * These are minimal declarations to support the integration
 */

declare module 'fast-transferlib' {
    import { EventEmitter } from 'events';

    export interface TransferOptions {
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
        bandwidth?: number;
        timeout?: number;
        retries?: number;
        username?: string;
        password?: string;
        keyFile?: string;
        useNativeTools?: boolean;
        windowsRobocopy?: boolean;
        preserveAcls?: boolean;
        preserveExtendedAttrs?: boolean;
        customArgs?: string[];
        preferRsync?: boolean;
        forceNative?: boolean;
        preferredMethod?: string;
        allowNetworkFallback?: boolean;
        rsyncPath?: string;
        rsyncArgs?: string[];
        strategy?: 'fastest' | 'most-compatible' | 'preserve-metadata' | 'compress' | 'network';
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

    export interface TransferTarget {
        path: string;
        host?: string;
        user?: string;
        port?: number;
        protocol?: 'smb' | 'nfs' | 'ssh' | 'ftp' | 'sftp' | 'local';
        isRemote: boolean;
        mountPoint?: string;
    }

    export interface RsyncCompatibilityResult {
        isAvailable: boolean;
        version?: string;
        path?: string;
        errorMessage?: string;
        installInstructions?: string;
    }

    export interface InstallationMethod {
        name: string;
        command: string;
        type: 'auto' | 'manual';
        description: string;
    }

    export class UnifiedTransferManager extends EventEmitter {
        constructor();
        initialize(): Promise<void>;
        transfer(source: string, destination: string, options?: TransferOptions): Promise<TransferResult>;
        on(event: 'progress', listener: (progress: TransferProgress) => void): this;
        on(event: string | symbol, listener: (...args: any[]) => void): this;
    }

    export class RsyncManager {
        constructor();
        initialize(): Promise<boolean>;
        transfer(source: string, destination: string, options?: TransferOptions): Promise<TransferResult>;
        transferToRemote(source: string, target: TransferTarget, options?: TransferOptions): Promise<TransferResult>;
        transferFromRemote(source: TransferTarget, destination: string, options?: TransferOptions): Promise<TransferResult>;
        copyFolder(source: string, destination: string, options?: TransferOptions): Promise<TransferResult>;
        mirrorDirectory(source: string, destination: string, options?: TransferOptions): Promise<TransferResult>;
        backup(source: string, backupDir: string, options?: TransferOptions): Promise<TransferResult>;
    }

    export class RsyncCompatibilityChecker {
        static checkCompatibility(): Promise<RsyncCompatibilityResult>;
        static getInstallInstructions(platform?: string): InstallationMethod[];
        static attemptAutoInstall(): Promise<{ success: boolean; message: string }>;
        static getCompatibilityReport(): Promise<string>;
    }

    export function createUnifiedTransferManager(): UnifiedTransferManager;
    export function checkRsyncCompatibility(): Promise<RsyncCompatibilityResult>;
    export function getRsyncInstallInstructions(platform?: string): InstallationMethod[];
}
