import React, { useState } from 'react';
import { useTransferManager } from '../../utils/TransferManager';
import { FileSystemItem } from '../../../shared/ipc-channels';
import { TransferProgress } from '../../../shared/transfer-types';

/**
 * Example component demonstrating fast-transferlib integration
 * This shows how to use the advanced transfer features in your components
 */

interface TransferExampleProps {
    selectedFiles: FileSystemItem[];
    destinationPath: string;
    onComplete?: () => void;
}

export const TransferExample: React.FC<TransferExampleProps> = ({
    selectedFiles,
    destinationPath,
    onComplete
}) => {
    const {
        copyFiles,
        moveFiles,
        syncDirectories,
        activeTransfers,
        isRsyncAvailable,
        isInitialized
    } = useTransferManager();

    const [currentProgress, setCurrentProgress] = useState<TransferProgress | null>(null);
    const [transferStatus, setTransferStatus] = useState<string>('');

    const handleCopy = async () => {
        setTransferStatus('Starting copy...');

        const { success, transferId } = await copyFiles(
            selectedFiles,
            destinationPath,
            {
                compress: true,
                recursive: true,
                archive: true,
                exclude: ['*.tmp', '*.log', 'node_modules']
            },
            {
                onProgress: (id, progress) => {
                    setCurrentProgress(progress);
                    setTransferStatus(`Copying: ${progress.percentage}%`);
                },
                onComplete: (id, result) => {
                    setTransferStatus(`Copied ${result.filesTransferred} files successfully!`);
                    setCurrentProgress(null);
                    onComplete?.();
                },
                onError: (id, error) => {
                    setTransferStatus(`Error: ${error}`);
                    setCurrentProgress(null);
                }
            }
        );

        if (!success) {
            setTransferStatus('Copy operation failed');
        }
    };

    const handleMove = async () => {
        setTransferStatus('Starting move...');

        const { success, transferId } = await moveFiles(
            selectedFiles,
            destinationPath,
            {
                compress: true,
                recursive: true,
                archive: true
            },
            {
                onProgress: (id, progress) => {
                    setCurrentProgress(progress);
                    setTransferStatus(`Moving: ${progress.percentage}%`);
                },
                onComplete: (id, result) => {
                    setTransferStatus(`Moved ${result.filesTransferred} files successfully!`);
                    setCurrentProgress(null);
                    onComplete?.();
                },
                onError: (id, error) => {
                    setTransferStatus(`Error: ${error}`);
                    setCurrentProgress(null);
                }
            }
        );

        if (!success) {
            setTransferStatus('Move operation failed');
        }
    };

    const handleSync = async (sourceDir: string) => {
        setTransferStatus('Starting sync...');

        const { success, transferId } = await syncDirectories(
            sourceDir,
            destinationPath,
            {
                delete: true,      // Delete files not in source
                recursive: true,
                archive: true,
                dryRun: false      // Set to true to preview changes
            },
            {
                onProgress: (id, progress) => {
                    setCurrentProgress(progress);
                    setTransferStatus(`Syncing: ${progress.percentage}%`);
                },
                onComplete: (id, result) => {
                    setTransferStatus('Sync completed successfully!');
                    setCurrentProgress(null);
                    onComplete?.();
                },
                onError: (id, error) => {
                    setTransferStatus(`Error: ${error}`);
                    setCurrentProgress(null);
                }
            }
        );

        if (!success) {
            setTransferStatus('Sync operation failed');
        }
    };

    if (!isInitialized) {
        return <div>Initializing transfer system...</div>;
    }

    return (
        <div className="transfer-example">
            <div className="transfer-info">
                <h3>Fast-TransferLib Integration</h3>
                <p>
                    Status: {isRsyncAvailable ? '✓ rsync available' : '⚠ Using fallback methods'}
                </p>
                <p>Active Transfers: {activeTransfers.length}</p>
            </div>

            <div className="transfer-controls">
                <button onClick={handleCopy} disabled={selectedFiles.length === 0}>
                    Copy Files
                </button>
                <button onClick={handleMove} disabled={selectedFiles.length === 0}>
                    Move Files
                </button>
                <button onClick={() => handleSync('/source/path')} disabled={!destinationPath}>
                    Sync Directories
                </button>
            </div>

            {transferStatus && (
                <div className="transfer-status">
                    <p>{transferStatus}</p>
                </div>
            )}

            {currentProgress && (
                <div className="transfer-progress">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${currentProgress.percentage}%` }}
                        />
                    </div>
                    <div className="progress-details">
                        <p>File: {currentProgress.currentFile}</p>
                        <p>Speed: {currentProgress.transferRate}</p>
                        <p>
                            Progress: {currentProgress.filesTransferred} / {currentProgress.totalFiles} files
                        </p>
                        {currentProgress.timeRemaining && (
                            <p>Time remaining: {currentProgress.timeRemaining}</p>
                        )}
                    </div>
                </div>
            )}

            {activeTransfers.length > 0 && (
                <div className="active-transfers">
                    <h4>Active Transfers:</h4>
                    <ul>
                        {activeTransfers.map(transfer => (
                            <li key={transfer.id}>
                                {transfer.type}: {transfer.source} → {transfer.destination}
                                {transfer.progress && ` (${transfer.progress.percentage}%)`}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

/**
 * Simpler example using FileOperations with advanced transfer
 */
export const SimpleTransferExample: React.FC = () => {
    const [progress, setProgress] = useState(0);

    const handlePaste = async (destination: string) => {
        const { FileOperations } = await import('../../utils/FileOperations');

        await FileOperations.pasteFiles(
            destination,
            {
                onProgress: (transferId: string, progress: TransferProgress) => {
                    setProgress(progress.percentage);
                    console.log(`Transfer ${transferId}: ${progress.percentage}%`);
                },
                onSuccess: (result: any) => {
                    console.log('Paste successful!', result);
                },
                onError: (error: string) => {
                    console.error('Paste failed:', error);
                }
            },
            {
                useAdvancedTransfer: true,  // Enable fast-transferlib
                showProgress: true
            }
        );
    };

    return (
        <div>
            <button onClick={() => handlePaste('/destination/path')}>
                Paste with Progress
            </button>
            {progress > 0 && (
                <div className="progress-bar">
                    <div style={{ width: `${progress}%` }} />
                    <span>{progress}%</span>
                </div>
            )}
        </div>
    );
};
