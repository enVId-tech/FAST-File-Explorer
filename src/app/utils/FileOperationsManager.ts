/**
 * FileOperationsManager.ts
 * Advanced file operations: merge, split, hash verification, file comparison
 */

export interface FileHash {
  algorithm: 'MD5' | 'SHA-1' | 'SHA-256';
  value: string;
  file: string;
  timestamp: number;
}

export interface SplitFileInfo {
  originalFile: string;
  parts: string[];
  partSize: number;
  totalSize: number;
  timestamp: number;
}

export interface ComparisonResult {
  file1: string;
  file2: string;
  identical: boolean;
  differences: Array<{
    type: 'binary' | 'text';
    position?: number;
    line?: number;
    expected?: string;
    actual?: string;
  }>;
  similarity: number; // 0-100%
}

export interface MergeOptions {
  files: string[];
  outputPath: string;
  separator?: string;
  addHeaders?: boolean;
}

export interface SplitOptions {
  file: string;
  outputDir: string;
  partSize: number; // in bytes
  prefix?: string;
}

class FileOperationsManagerClass {
  private static instance: FileOperationsManagerClass;
  private hashHistory: FileHash[] = [];
  private splitHistory: SplitFileInfo[] = [];

  private constructor() {
    this.loadHistory();
  }

  public static getInstance(): FileOperationsManagerClass {
    if (!FileOperationsManagerClass.instance) {
      FileOperationsManagerClass.instance = new FileOperationsManagerClass();
    }
    return FileOperationsManagerClass.instance;
  }

  /**
   * Load operation history from storage
   */
  private loadHistory(): void {
    try {
      const hashData = localStorage.getItem('fileOperations_hashHistory');
      if (hashData) {
        this.hashHistory = JSON.parse(hashData);
      }

      const splitData = localStorage.getItem('fileOperations_splitHistory');
      if (splitData) {
        this.splitHistory = JSON.parse(splitData);
      }
    } catch (error) {
      console.error('Error loading file operations history:', error);
    }
  }

  /**
   * Save operation history to storage
   */
  private saveHistory(): void {
    try {
      localStorage.setItem('fileOperations_hashHistory', JSON.stringify(this.hashHistory.slice(-50)));
      localStorage.setItem('fileOperations_splitHistory', JSON.stringify(this.splitHistory.slice(-50)));
    } catch (error) {
      console.error('Error saving file operations history:', error);
    }
  }

  /**
   * Calculate file hash
   */
  public async calculateHash(
    filePath: string,
    algorithm: 'MD5' | 'SHA-1' | 'SHA-256' = 'SHA-256'
  ): Promise<FileHash> {
    try {
      // Use Electron API to calculate hash
      const hash = await window.electronAPI.fileOperations.calculateFileHash(filePath, algorithm);

      const result: FileHash = {
        algorithm,
        value: hash,
        file: filePath,
        timestamp: Date.now(),
      };

      // Add to history
      this.hashHistory.push(result);
      this.saveHistory();

      return result;
    } catch (error) {
      console.error('Error calculating hash:', error);
      throw new Error(`Failed to calculate hash: ${error}`);
    }
  }

  /**
   * Verify file hash
   */
  public async verifyHash(filePath: string, expectedHash: string, algorithm: 'MD5' | 'SHA-1' | 'SHA-256'): Promise<boolean> {
    try {
      const result = await this.calculateHash(filePath, algorithm);
      return result.value.toLowerCase() === expectedHash.toLowerCase();
    } catch (error) {
      console.error('Error verifying hash:', error);
      return false;
    }
  }

  /**
   * Merge multiple files into one
   */
  public async mergeFiles(options: MergeOptions): Promise<void> {
    try {
      const { files, outputPath, separator, addHeaders } = options;

      if (files.length === 0) {
        throw new Error('No files to merge');
      }

      await window.electronAPI.fileOperations.mergeFiles({
        files,
        outputPath,
        separator: separator || '\n',
        addHeaders: addHeaders || false,
      });

      console.log(`Successfully merged ${files.length} files into ${outputPath}`);
    } catch (error) {
      console.error('Error merging files:', error);
      throw new Error(`Failed to merge files: ${error}`);
    }
  }

  /**
   * Split a large file into smaller parts
   */
  public async splitFile(options: SplitOptions): Promise<SplitFileInfo> {
    try {
      const { file, outputDir, partSize, prefix } = options;

      if (partSize <= 0) {
        throw new Error('Part size must be greater than 0');
      }

      // Get file stats
      const stats = await window.electronAPI.fileOperations.getFileStats(file);
      const totalParts = Math.ceil(stats.size / partSize);

      const parts: string[] = [];
      const fileName = file.split(/[/\\]/).pop() || 'file';
      const prefixName = prefix || fileName;

      // Split file
      for (let i = 0; i < totalParts; i++) {
        const partPath = `${outputDir}/${prefixName}.part${i + 1}`;
        await window.electronAPI.fileOperations.splitFilePart(file, partPath, i * partSize, partSize);
        parts.push(partPath);
      }

      const result: SplitFileInfo = {
        originalFile: file,
        parts,
        partSize,
        totalSize: stats.size,
        timestamp: Date.now(),
      };

      // Add to history
      this.splitHistory.push(result);
      this.saveHistory();

      return result;
    } catch (error) {
      console.error('Error splitting file:', error);
      throw new Error(`Failed to split file: ${error}`);
    }
  }

  /**
   * Compare two files
   */
  public async compareFiles(file1: string, file2: string, mode: 'binary' | 'text' = 'binary'): Promise<ComparisonResult> {
    try {
      const result = await window.electronAPI.fileOperations.compareFiles(file1, file2, mode);

      const comparison: ComparisonResult = {
        file1,
        file2,
        identical: result.identical,
        differences: result.differences || [],
        similarity: result.similarity || (result.identical ? 100 : 0),
      };

      return comparison;
    } catch (error) {
      console.error('Error comparing files:', error);
      throw new Error(`Failed to compare files: ${error}`);
    }
  }

  /**
   * Get hash history
   */
  public getHashHistory(limit?: number): FileHash[] {
    return limit ? this.hashHistory.slice(-limit) : [...this.hashHistory];
  }

  /**
   * Get split history
   */
  public getSplitHistory(limit?: number): SplitFileInfo[] {
    return limit ? this.splitHistory.slice(-limit) : [...this.splitHistory];
  }

  /**
   * Clear history
   */
  public clearHistory(type?: 'hash' | 'split'): void {
    if (!type || type === 'hash') {
      this.hashHistory = [];
    }
    if (!type || type === 'split') {
      this.splitHistory = [];
    }
    this.saveHistory();
  }

  /**
   * Export hash history to CSV
   */
  public exportHashHistory(): string {
    const headers = ['File', 'Algorithm', 'Hash', 'Date'];
    const rows = this.hashHistory.map(hash => [
      hash.file,
      hash.algorithm,
      hash.value,
      new Date(hash.timestamp).toLocaleString(),
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Generate checksum file
   */
  public async generateChecksumFile(
    files: string[],
    outputPath: string,
    algorithm: 'MD5' | 'SHA-1' | 'SHA-256' = 'SHA-256'
  ): Promise<void> {
    try {
      const checksums: string[] = [];

      for (const file of files) {
        const hash = await this.calculateHash(file, algorithm);
        const fileName = file.split(/[/\\]/).pop() || file;
        checksums.push(`${hash.value}  ${fileName}`);
      }

      const content = checksums.join('\n');
      await window.electronAPI.fileOperations.writeFile(outputPath, content);

      console.log(`Checksum file created: ${outputPath}`);
    } catch (error) {
      console.error('Error generating checksum file:', error);
      throw new Error(`Failed to generate checksum file: ${error}`);
    }
  }

  /**
   * Verify files against checksum file
   */
  public async verifyChecksumFile(checksumFilePath: string, baseDir: string): Promise<{
    verified: string[];
    failed: string[];
    missing: string[];
  }> {
    try {
      const content = await window.electronAPI.fileOperations.readFile(checksumFilePath);
      const lines = content.split('\n').filter(line => line.trim());

      const verified: string[] = [];
      const failed: string[] = [];
      const missing: string[] = [];

      for (const line of lines) {
        const match = line.match(/^([a-fA-F0-9]+)\s+(.+)$/);
        if (!match) continue;

        const [, expectedHash, fileName] = match;
        const filePath = `${baseDir}/${fileName}`;

        // Check if file exists
        const exists = await window.electronAPI.fileOperations.fileExists(filePath);
        if (!exists) {
          missing.push(fileName);
          continue;
        }

        // Determine algorithm by hash length
        let algorithm: 'MD5' | 'SHA-1' | 'SHA-256' = 'SHA-256';
        if (expectedHash.length === 32) algorithm = 'MD5';
        else if (expectedHash.length === 40) algorithm = 'SHA-1';
        else if (expectedHash.length === 64) algorithm = 'SHA-256';

        // Verify hash
        const isValid = await this.verifyHash(filePath, expectedHash, algorithm);
        if (isValid) {
          verified.push(fileName);
        } else {
          failed.push(fileName);
        }
      }

      return { verified, failed, missing };
    } catch (error) {
      console.error('Error verifying checksum file:', error);
      throw new Error(`Failed to verify checksum file: ${error}`);
    }
  }

  /**
   * Reconstruct file from parts
   */
  public async reconstructFile(parts: string[], outputPath: string): Promise<void> {
    try {
      if (parts.length === 0) {
        throw new Error('No parts to reconstruct');
      }

      await window.electronAPI.fileOperations.reconstructFile(parts, outputPath);

      console.log(`Successfully reconstructed file: ${outputPath}`);
    } catch (error) {
      console.error('Error reconstructing file:', error);
      throw new Error(`Failed to reconstruct file: ${error}`);
    }
  }

  /**
   * Find duplicate files by hash
   */
  public async findDuplicates(
    directory: string,
    recursive: boolean = true,
    algorithm: 'MD5' | 'SHA-1' | 'SHA-256' = 'SHA-256'
  ): Promise<Map<string, string[]>> {
    try {
      const files = await window.electronAPI.fileOperations.listFiles(directory, recursive);
      const hashMap = new Map<string, string[]>();

      for (const file of files) {
        const hash = await this.calculateHash(file, algorithm);
        const existing = hashMap.get(hash.value) || [];
        existing.push(file);
        hashMap.set(hash.value, existing);
      }

      // Filter to only duplicates
      const duplicates = new Map<string, string[]>();
      hashMap.forEach((files, hash) => {
        if (files.length > 1) {
          duplicates.set(hash, files);
        }
      });

      return duplicates;
    } catch (error) {
      console.error('Error finding duplicates:', error);
      throw new Error(`Failed to find duplicates: ${error}`);
    }
  }
}

// Export singleton instance
export const fileOperationsManager = FileOperationsManagerClass.getInstance();
