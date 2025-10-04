/**
 * Archive Manager
 * Handles archive creation, extraction, and viewing
 * Supports ZIP, RAR, 7Z, TAR, TAR.GZ formats
 */

export interface ArchiveFormat {
  extension: string;
  name: string;
  supportsCompression: boolean;
  supportsPassword: boolean;
  supportsEncryption: boolean;
}

export interface ArchiveOptions {
  format: string;
  compressionLevel?: number; // 0-9
  password?: string;
  encryption?: 'AES128' | 'AES256' | 'ZipCrypto';
  splitSize?: number; // MB
  includeSubfolders?: boolean;
  preserveStructure?: boolean;
  excludePatterns?: string[];
}

export interface ArchiveEntry {
  name: string;
  path: string;
  size: number;
  compressedSize: number;
  compressionRatio: number;
  modified: Date;
  isDirectory: boolean;
  encrypted: boolean;
}

export interface ArchiveInfo {
  path: string;
  format: string;
  size: number;
  compressedSize: number;
  compressionRatio: number;
  entryCount: number;
  created: Date;
  encrypted: boolean;
  entries: ArchiveEntry[];
}

export interface ExtractionOptions {
  destination: string;
  password?: string;
  overwrite?: boolean;
  selectedFiles?: string[];
  preserveStructure?: boolean;
  createSubfolder?: boolean;
}

class ArchiveManagerClass {
  private static instance: ArchiveManagerClass;

  private readonly supportedFormats: ArchiveFormat[] = [
    {
      extension: 'zip',
      name: 'ZIP Archive',
      supportsCompression: true,
      supportsPassword: true,
      supportsEncryption: true,
    },
    {
      extension: '7z',
      name: '7-Zip Archive',
      supportsCompression: true,
      supportsPassword: true,
      supportsEncryption: true,
    },
    {
      extension: 'rar',
      name: 'RAR Archive',
      supportsCompression: true,
      supportsPassword: true,
      supportsEncryption: true,
    },
    {
      extension: 'tar',
      name: 'TAR Archive',
      supportsCompression: false,
      supportsPassword: false,
      supportsEncryption: false,
    },
    {
      extension: 'tar.gz',
      name: 'TAR.GZ Archive',
      supportsCompression: true,
      supportsPassword: false,
      supportsEncryption: false,
    },
    {
      extension: 'tar.bz2',
      name: 'TAR.BZ2 Archive',
      supportsCompression: true,
      supportsPassword: false,
      supportsEncryption: false,
    },
  ];

  private constructor() {
    this.initializeArchiveManager();
  }

  public static getInstance(): ArchiveManagerClass {
    if (!ArchiveManagerClass.instance) {
      ArchiveManagerClass.instance = new ArchiveManagerClass();
    }
    return ArchiveManagerClass.instance;
  }

  private initializeArchiveManager(): void {
    console.log('[ArchiveManager] Initialized with support for:', 
      this.supportedFormats.map(f => f.extension).join(', '));
  }

  /**
   * Get all supported archive formats
   */
  public getSupportedFormats(): ArchiveFormat[] {
    return [...this.supportedFormats];
  }

  /**
   * Check if a file is an archive
   */
  public isArchive(filePath: string): boolean {
    const ext = this.getFileExtension(filePath).toLowerCase();
    return this.supportedFormats.some(f => f.extension === ext);
  }

  /**
   * Get format by extension
   */
  public getFormat(extension: string): ArchiveFormat | null {
    const ext = extension.toLowerCase().replace('.', '');
    return this.supportedFormats.find(f => f.extension === ext) || null;
  }

  /**
   * Create an archive from files/folders
   */
  public async createArchive(
    sourcePaths: string[],
    destinationPath: string,
    options: ArchiveOptions
  ): Promise<{ success: boolean; message: string; archivePath?: string }> {
    try {
      console.log('[ArchiveManager] Creating archive:', {
        sources: sourcePaths.length,
        destination: destinationPath,
        format: options.format,
      });

      // Validate format
      const format = this.getFormat(options.format);
      if (!format) {
        return { success: false, message: `Unsupported format: ${options.format}` };
      }

      // Validate sources
      if (sourcePaths.length === 0) {
        return { success: false, message: 'No source files selected' };
      }

      // Validate compression level
      if (options.compressionLevel !== undefined) {
        if (!format.supportsCompression) {
          return { success: false, message: `${format.name} does not support compression` };
        }
        if (options.compressionLevel < 0 || options.compressionLevel > 9) {
          return { success: false, message: 'Compression level must be between 0-9' };
        }
      }

      // Validate password/encryption
      if (options.password) {
        if (!format.supportsPassword) {
          return { success: false, message: `${format.name} does not support password protection` };
        }
        if (options.password.length < 4) {
          return { success: false, message: 'Password must be at least 4 characters' };
        }
      }

      if (options.encryption && !format.supportsEncryption) {
        return { success: false, message: `${format.name} does not support encryption` };
      }

      // Call Electron IPC to create archive
      const result = await window.electronAPI.archives.create({
        sources: sourcePaths,
        destination: destinationPath,
        format: options.format,
        compressionLevel: options.compressionLevel || 5,
        password: options.password,
        encryption: options.encryption,
        splitSize: options.splitSize,
        includeSubfolders: options.includeSubfolders !== false,
        preserveStructure: options.preserveStructure !== false,
        excludePatterns: options.excludePatterns || [],
      });

      if (result.success) {
        console.log('[ArchiveManager] Archive created successfully:', result.archivePath);
        return {
          success: true,
          message: 'Archive created successfully',
          archivePath: result.archivePath,
        };
      } else {
        return { success: false, message: result.message || 'Failed to create archive' };
      }
    } catch (error) {
      console.error('[ArchiveManager] Error creating archive:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract an archive
   */
  public async extractArchive(
    archivePath: string,
    options: ExtractionOptions
  ): Promise<{ success: boolean; message: string; extractedFiles?: number }> {
    try {
      console.log('[ArchiveManager] Extracting archive:', archivePath);

      // Validate archive exists and is supported
      if (!this.isArchive(archivePath)) {
        return { success: false, message: 'File is not a supported archive format' };
      }

      // Call Electron IPC to extract archive
      const result = await window.electronAPI.archives.extract({
        archivePath,
        destination: options.destination,
        password: options.password,
        overwrite: options.overwrite !== false,
        selectedFiles: options.selectedFiles,
        preserveStructure: options.preserveStructure !== false,
        createSubfolder: options.createSubfolder !== false,
      });

      if (result.success) {
        console.log('[ArchiveManager] Archive extracted successfully:', result.extractedFiles);
        return {
          success: true,
          message: `Extracted ${result.extractedFiles} file(s)`,
          extractedFiles: result.extractedFiles,
        };
      } else {
        return { success: false, message: result.message || 'Failed to extract archive' };
      }
    } catch (error) {
      console.error('[ArchiveManager] Error extracting archive:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get archive information
   */
  public async getArchiveInfo(archivePath: string, password?: string): Promise<ArchiveInfo | null> {
    try {
      console.log('[ArchiveManager] Getting archive info:', archivePath);

      const result = await window.electronAPI.archives.getInfo({
        archivePath,
        password,
      });

      if (result.success && result.info) {
        return result.info as ArchiveInfo;
      }

      return null;
    } catch (error) {
      console.error('[ArchiveManager] Error getting archive info:', error);
      return null;
    }
  }

  /**
   * Test archive integrity
   */
  public async testArchive(
    archivePath: string,
    password?: string
  ): Promise<{ success: boolean; message: string; errors?: string[] }> {
    try {
      console.log('[ArchiveManager] Testing archive:', archivePath);

      const result = await window.electronAPI.archives.test({
        archivePath,
        password,
      });

      return {
        success: result.success,
        message: result.message || (result.success ? 'Archive is valid' : 'Archive is corrupted'),
        errors: result.errors,
      };
    } catch (error) {
      console.error('[ArchiveManager] Error testing archive:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get compression preview (estimate size)
   */
  public async getCompressionPreview(
    sourcePaths: string[],
    format: string,
    compressionLevel: number
  ): Promise<{
    originalSize: number;
    estimatedSize: number;
    estimatedRatio: number;
    estimatedTime: number;
  } | null> {
    try {
      const result = await window.electronAPI.archives.preview({
        sources: sourcePaths,
        format,
        compressionLevel,
      });

      if (result.success && result.preview) {
        return result.preview;
      }

      return null;
    } catch (error) {
      console.error('[ArchiveManager] Error getting compression preview:', error);
      return null;
    }
  }

  /**
   * Add files to existing archive
   */
  public async addToArchive(
    archivePath: string,
    filesToAdd: string[],
    options: Partial<ArchiveOptions>
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[ArchiveManager] Adding files to archive:', archivePath);

      const result = await window.electronAPI.archives.addFiles({
        archivePath,
        files: filesToAdd,
        ...options,
      });

      return {
        success: result.success,
        message: result.message || (result.success ? 'Files added successfully' : 'Failed to add files'),
      };
    } catch (error) {
      console.error('[ArchiveManager] Error adding files to archive:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Remove files from archive
   */
  public async removeFromArchive(
    archivePath: string,
    filesToRemove: string[]
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[ArchiveManager] Removing files from archive:', archivePath);

      const result = await window.electronAPI.archives.removeFiles({
        archivePath,
        files: filesToRemove,
      });

      return {
        success: result.success,
        message: result.message || (result.success ? 'Files removed successfully' : 'Failed to remove files'),
      };
    } catch (error) {
      console.error('[ArchiveManager] Error removing files from archive:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get recent archives
   */
  public getRecentArchives(): Array<{ path: string; timestamp: Date; operation: string }> {
    try {
      const stored = localStorage.getItem('archiveHistory');
      if (stored) {
        const history = JSON.parse(stored);
        return history.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }
      return [];
    } catch (error) {
      console.error('[ArchiveManager] Error loading archive history:', error);
      return [];
    }
  }

  /**
   * Add to archive history
   */
  private addToHistory(path: string, operation: string): void {
    try {
      const history = this.getRecentArchives();
      history.unshift({ path, operation, timestamp: new Date() });

      // Keep last 50
      const trimmed = history.slice(0, 50);
      localStorage.setItem('archiveHistory', JSON.stringify(trimmed));
    } catch (error) {
      console.error('[ArchiveManager] Error saving archive history:', error);
    }
  }

  /**
   * Clear archive history
   */
  public clearHistory(): void {
    localStorage.removeItem('archiveHistory');
  }

  /**
   * Get file extension
   */
  private getFileExtension(filePath: string): string {
    const fileName = filePath.split(/[\\/]/).pop() || '';
    
    // Handle double extensions like .tar.gz
    if (fileName.includes('.tar.')) {
      const parts = fileName.split('.');
      if (parts.length >= 3) {
        return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
      }
    }
    
    return fileName.split('.').pop() || '';
  }

  /**
   * Format file size
   */
  public formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Calculate compression ratio
   */
  public calculateCompressionRatio(originalSize: number, compressedSize: number): number {
    if (originalSize === 0) return 0;
    return Math.round(((originalSize - compressedSize) / originalSize) * 100);
  }
}

export const archiveManager = ArchiveManagerClass.getInstance();
