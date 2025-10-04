import { ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import * as fsSync from 'fs';
import * as crypto from 'crypto';

// Dynamic import for fast-transferlib
let UnifiedTransferManagerClass: any;
let transferLibAvailable = false;

async function loadTransferLib() {
    if (!transferLibAvailable) {
        try {
            const lib = await import('fast-transferlib');
            UnifiedTransferManagerClass = lib.UnifiedTransferManager;
            transferLibAvailable = true;
        } catch (error) {
            console.warn('Fast-transferlib not available for file operations');
        }
    }
    return transferLibAvailable;
}

/**
 * File operations IPC handlers for copy, move, delete, rename, create
 */
export function registerFileOperationsHandlers(): void {
    console.log('Registering file operations handlers...');

    // Copy files
    ipcMain.handle('file-copy', async (event, sources: string[], destination: string) => {
        try {
            // Try to use fast-transferlib for better performance
            if (await loadTransferLib()) {
                try {
                    const manager = new UnifiedTransferManagerClass();
                    await manager.initialize();

                    const results = [];
                    for (const source of sources) {
                        const result = await manager.transfer(source, destination, {
                            recursive: true,
                            archive: true,
                            forceNative: process.platform === 'win32'
                        });
                        results.push(result);
                    }

                    const allSuccessful = results.every(r => r.success);
                    if (!allSuccessful) {
                        throw new Error('Some files failed to copy');
                    }
                    return { success: true };
                } catch (transferError) {
                    console.warn('Transfer lib failed, using fallback:', transferError);
                }
            }

            // Fallback to standard copy
            for (const source of sources) {
                const destPath = path.join(destination, path.basename(source));
                const stat = await fs.stat(source);
                
                if (stat.isDirectory()) {
                    await copyDirectoryRecursive(source, destPath);
                } else {
                    await fs.copyFile(source, destPath);
                }
            }
            return { success: true };
        } catch (error) {
            console.error('Copy operation failed:', error);
            throw error;
        }
    });

    // Cut files (copy then delete)
    ipcMain.handle('file-cut', async (event, sources: string[], destination: string) => {
        try {
            // Try to use fast-transferlib for move operations
            if (await loadTransferLib()) {
                try {
                    const manager = new UnifiedTransferManagerClass();
                    await manager.initialize();

                    const results = [];
                    for (const source of sources) {
                        // Copy first
                        const result = await manager.transfer(source, destination, {
                            recursive: true,
                            archive: true,
                            forceNative: process.platform === 'win32'
                        });
                        
                        if (result.success) {
                            // Delete source after successful copy
                            const stat = await fs.stat(source);
                            if (stat.isDirectory()) {
                                await fs.rm(source, { recursive: true });
                            } else {
                                await fs.unlink(source);
                            }
                        }
                        results.push(result);
                    }

                    const allSuccessful = results.every(r => r.success);
                    if (!allSuccessful) {
                        throw new Error('Some files failed to move');
                    }
                    return { success: true };
                } catch (transferError) {
                    console.warn('Transfer lib failed, using fallback:', transferError);
                }
            }

            // Fallback to standard move
            for (const source of sources) {
                const destPath = path.join(destination, path.basename(source));
                const stat = await fs.stat(source);
                
                if (stat.isDirectory()) {
                    await copyDirectoryRecursive(source, destPath);
                    await fs.rm(source, { recursive: true });
                } else {
                    await fs.copyFile(source, destPath);
                    await fs.unlink(source);
                }
            }
            return { success: true };
        } catch (error) {
            console.error('Cut operation failed:', error);
            throw error;
        }
    });

    // Delete files with improved error handling
    ipcMain.handle('file-delete', async (event, paths: string[]) => {
        const results = [];
        for (const filePath of paths) {
            try {
                const stat = await fs.stat(filePath);
                if (stat.isDirectory()) {
                    await fs.rmdir(filePath, { recursive: true });
                } else {
                    await fs.unlink(filePath);
                }
                results.push({ path: filePath, success: true });
            } catch (error: any) {
                if (error.code === 'ENOENT') {
                    // File doesn't exist - consider it successfully deleted
                    results.push({ path: filePath, success: true, wasAlreadyDeleted: true });
                } else {
                    console.error(`Failed to delete ${filePath}:`, error);
                    results.push({ path: filePath, success: false, error: error.message });
                }
            }
        }
        return { results };
    });

    // Rename file
    ipcMain.handle('file-rename', async (event, oldPath: string, newName: string) => {
        try {
            const newPath = path.join(path.dirname(oldPath), newName);
            await fs.rename(oldPath, newPath);
            return { success: true, newPath };
        } catch (error) {
            console.error('Rename operation failed:', error);
            throw error;
        }
    });

    // Create folder
    ipcMain.handle('file-create-folder', async (event, parentPath: string, name: string) => {
        try {
            const folderPath = path.join(parentPath, name);
            await fs.mkdir(folderPath, { recursive: true });
            return { success: true, path: folderPath };
        } catch (error) {
            console.error('Create folder operation failed:', error);
            throw error;
        }
    });

    // Show file properties (open system properties dialog)
    ipcMain.handle('file-show-properties', async (event, filePath: string) => {
        try {
            // Platform-specific property dialogs
            if (process.platform === 'win32') {
                const { spawn } = require('child_process');
                spawn('cmd', ['/c', 'start', 'ms-settings:defaultapps'], { detached: true });
            } else {
                await shell.showItemInFolder(filePath);
            }
            return { success: true };
        } catch (error) {
            console.error('Show properties failed:', error);
            throw error;
        }
    });

    // Show file in system explorer
    ipcMain.handle('file-show-in-explorer', async (event, filePath: string) => {
        try {
            await shell.showItemInFolder(filePath);
            return { success: true };
        } catch (error) {
            console.error('Show in explorer failed:', error);
            throw error;
        }
    });

    // === Advanced File Operations ===

    // Calculate file hash
    ipcMain.handle('fileOperations:calculateFileHash', async (_event, filePath: string, algorithm: 'MD5' | 'SHA-1' | 'SHA-256') => {
        return new Promise((resolve, reject) => {
            const hashAlgo = algorithm.toLowerCase().replace('-', '');
            const hash = crypto.createHash(hashAlgo);
            const stream = fsSync.createReadStream(filePath);

            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', (error) => reject(error));
        });
    });

    // Compare files
    ipcMain.handle('fileOperations:compareFiles', async (_event, file1: string, file2: string, mode: 'binary' | 'text') => {
        const [stats1, stats2] = await Promise.all([fs.stat(file1), fs.stat(file2)]);
        
        if (stats1.size !== stats2.size) {
            return { identical: false, differences: [{ type: 'size' }], similarity: 0 };
        }

        if (mode === 'binary') {
            const [buffer1, buffer2] = await Promise.all([fs.readFile(file1), fs.readFile(file2)]);
            const identical = buffer1.equals(buffer2);
            
            if (identical) return { identical: true, differences: [], similarity: 100 };
            
            const differences: any[] = [];
            for (let i = 0; i < buffer1.length && differences.length < 100; i++) {
                if (buffer1[i] !== buffer2[i]) differences.push({ type: 'binary', position: i });
            }
            
            return { identical: false, differences, similarity: ((stats1.size - differences.length) / stats1.size) * 100 };
        } else {
            const [content1, content2] = await Promise.all([fs.readFile(file1, 'utf-8'), fs.readFile(file2, 'utf-8')]);
            
            if (content1 === content2) return { identical: true, differences: [], similarity: 100 };
            
            const lines1 = content1.split('\n');
            const lines2 = content2.split('\n');
            const differences: any[] = [];
            const maxLines = Math.max(lines1.length, lines2.length);
            
            for (let i = 0; i < maxLines && differences.length < 100; i++) {
                if (lines1[i] !== lines2[i]) {
                    differences.push({ type: 'text', line: i + 1, expected: lines1[i], actual: lines2[i] });
                }
            }
            
            return { identical: false, differences, similarity: ((maxLines - differences.length) / maxLines) * 100 };
        }
    });

    // Merge files
    ipcMain.handle('fileOperations:mergeFiles', async (_event, options: any) => {
        const { files, outputPath, separator, addHeaders } = options;
        const writeStream = fsSync.createWriteStream(outputPath);

        for (let i = 0; i < files.length; i++) {
            if (addHeaders) {
                writeStream.write(`\n=== ${path.basename(files[i])} ===\n`);
            }
            const content = await fs.readFile(files[i]);
            writeStream.write(content);
            if (i < files.length - 1) writeStream.write(separator);
        }

        writeStream.end();
        return new Promise((resolve, reject) => {
            writeStream.on('finish', () => resolve(undefined));
            writeStream.on('error', reject);
        });
    });

    // Split file part
    ipcMain.handle('fileOperations:splitFilePart', async (_event, filePath: string, partPath: string, offset: number, length: number) => {
        const readStream = fsSync.createReadStream(filePath, { start: offset, end: offset + length - 1 });
        const writeStream = fsSync.createWriteStream(partPath);

        return new Promise((resolve, reject) => {
            readStream.pipe(writeStream);
            writeStream.on('finish', () => resolve(undefined));
            writeStream.on('error', reject);
            readStream.on('error', reject);
        });
    });

    // Reconstruct file
    ipcMain.handle('fileOperations:reconstructFile', async (_event, parts: string[], outputPath: string) => {
        const writeStream = fsSync.createWriteStream(outputPath);

        for (const partPath of parts) {
            const content = await fs.readFile(partPath);
            writeStream.write(content);
        }

        writeStream.end();
        return new Promise((resolve, reject) => {
            writeStream.on('finish', () => resolve(undefined));
            writeStream.on('error', reject);
        });
    });

    // Get file stats
    ipcMain.handle('fileOperations:getFileStats', async (_event, filePath: string) => {
        const stats = await fs.stat(filePath);
        return { size: stats.size, modified: stats.mtimeMs, created: stats.birthtimeMs };
    });

    // File exists
    ipcMain.handle('fileOperations:fileExists', async (_event, filePath: string) => {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    });

    // Read file
    ipcMain.handle('fileOperations:readFile', async (_event, filePath: string) => {
        return await fs.readFile(filePath, 'utf-8');
    });

    // Write file
    ipcMain.handle('fileOperations:writeFile', async (_event, filePath: string, content: string) => {
        return await fs.writeFile(filePath, content, 'utf-8');
    });

    // List files
    ipcMain.handle('fileOperations:listFiles', async (_event, directory: string, recursive: boolean) => {
        const files: string[] = [];

        async function scan(dir: string): Promise<void> {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isFile()) {
                    files.push(fullPath);
                } else if (entry.isDirectory() && recursive) {
                    await scan(fullPath);
                }
            }
        }

        await scan(directory);
        return files;
    });

    console.log('✅ Advanced file operations IPC handlers registered');
}

/**
 * Recursively copy directory
 */
async function copyDirectoryRecursive(source: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(source, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyDirectoryRecursive(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}
