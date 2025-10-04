/**
 * Backup Manager
 * Handles automatic backups, scheduled sync, version control
 */

export interface BackupProfile {
  id: string;
  name: string;
  sourcePaths: string[];
  destinationPath: string;
  schedule: BackupSchedule;
  options: BackupOptions;
  enabled: boolean;
  lastBackup?: Date;
  nextBackup?: Date;
  statistics: {
    totalBackups: number;
    successfulBackups: number;
    failedBackups: number;
    totalSize: number;
    lastSize: number;
  };
}

export interface BackupSchedule {
  type: 'manual' | 'interval' | 'daily' | 'weekly' | 'monthly';
  interval?: number; // minutes for interval type
  time?: string; // HH:MM for daily
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
}

export interface BackupOptions {
  compressionEnabled: boolean;
  compressionLevel: number; // 0-9
  encryptionEnabled: boolean;
  encryptionPassword?: string;
  versioning: boolean;
  maxVersions: number;
  incrementalBackup: boolean;
  excludePatterns: string[];
  verifyAfterBackup: boolean;
  deleteOldBackups: boolean;
  retentionDays: number;
}

export interface BackupVersion {
  id: string;
  profileId: string;
  timestamp: Date;
  size: number;
  fileCount: number;
  type: 'full' | 'incremental';
  compressed: boolean;
  encrypted: boolean;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}

export interface RestoreOptions {
  destination: string;
  overwriteExisting: boolean;
  restorePermissions: boolean;
  restoreTimestamps: boolean;
  selectedFiles?: string[];
}

class BackupManagerClass {
  private static instance: BackupManagerClass;
  private profiles: Map<string, BackupProfile> = new Map();
  private versions: Map<string, BackupVersion[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private activeBackups: Set<string> = new Set();

  private constructor() {
    this.initializeManager();
  }

  public static getInstance(): BackupManagerClass {
    if (!BackupManagerClass.instance) {
      BackupManagerClass.instance = new BackupManagerClass();
    }
    return BackupManagerClass.instance;
  }

  private initializeManager(): void {
    this.loadProfiles();
    this.loadVersions();
    this.scheduleEnabledProfiles();
    console.log('[BackupManager] Initialized with', this.profiles.size, 'profiles');
  }

  /**
   * Load backup profiles
   */
  private loadProfiles(): void {
    try {
      const stored = localStorage.getItem('backupProfiles');
      if (stored) {
        const profiles = JSON.parse(stored);
        profiles.forEach((profile: BackupProfile) => {
          if (profile.lastBackup) profile.lastBackup = new Date(profile.lastBackup);
          if (profile.nextBackup) profile.nextBackup = new Date(profile.nextBackup);
          this.profiles.set(profile.id, profile);
        });
      }
    } catch (error) {
      console.error('[BackupManager] Error loading profiles:', error);
    }
  }

  /**
   * Save backup profiles
   */
  private saveProfiles(): void {
    try {
      const profiles = Array.from(this.profiles.values());
      localStorage.setItem('backupProfiles', JSON.stringify(profiles));
    } catch (error) {
      console.error('[BackupManager] Error saving profiles:', error);
    }
  }

  /**
   * Load backup versions
   */
  private loadVersions(): void {
    try {
      const stored = localStorage.getItem('backupVersions');
      if (stored) {
        const versionsMap = JSON.parse(stored);
        Object.entries(versionsMap).forEach(([profileId, versions]) => {
          const parsedVersions = (versions as any[]).map(v => ({
            ...v,
            timestamp: new Date(v.timestamp),
          }));
          this.versions.set(profileId, parsedVersions);
        });
      }
    } catch (error) {
      console.error('[BackupManager] Error loading versions:', error);
    }
  }

  /**
   * Save backup versions
   */
  private saveVersions(): void {
    try {
      const versionsObj: any = {};
      this.versions.forEach((versions, profileId) => {
        versionsObj[profileId] = versions;
      });
      localStorage.setItem('backupVersions', JSON.stringify(versionsObj));
    } catch (error) {
      console.error('[BackupManager] Error saving versions:', error);
    }
  }

  /**
   * Create backup profile
   */
  public createProfile(
    name: string,
    sourcePaths: string[],
    destinationPath: string,
    schedule: BackupSchedule,
    options: BackupOptions
  ): BackupProfile {
    const profile: BackupProfile = {
      id: `backup-${Date.now()}`,
      name,
      sourcePaths,
      destinationPath,
      schedule,
      options,
      enabled: false,
      statistics: {
        totalBackups: 0,
        successfulBackups: 0,
        failedBackups: 0,
        totalSize: 0,
        lastSize: 0,
      },
    };

    this.profiles.set(profile.id, profile);
    this.saveProfiles();
    console.log('[BackupManager] Profile created:', profile.name);

    return profile;
  }

  /**
   * Update backup profile
   */
  public updateProfile(profileId: string, updates: Partial<BackupProfile>): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile) return false;

    Object.assign(profile, updates);
    this.saveProfiles();

    // Reschedule if schedule changed
    if (updates.schedule || updates.enabled !== undefined) {
      this.unscheduleProfile(profileId);
      if (profile.enabled) {
        this.scheduleProfile(profileId);
      }
    }

    return true;
  }

  /**
   * Delete backup profile
   */
  public deleteProfile(profileId: string): boolean {
    this.unscheduleProfile(profileId);
    this.versions.delete(profileId);
    const result = this.profiles.delete(profileId);
    this.saveProfiles();
    this.saveVersions();
    return result;
  }

  /**
   * Get all profiles
   */
  public getProfiles(): BackupProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get profile by ID
   */
  public getProfile(profileId: string): BackupProfile | null {
    return this.profiles.get(profileId) || null;
  }

  /**
   * Enable/disable profile
   */
  public setProfileEnabled(profileId: string, enabled: boolean): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile) return false;

    profile.enabled = enabled;
    this.saveProfiles();

    if (enabled) {
      this.scheduleProfile(profileId);
    } else {
      this.unscheduleProfile(profileId);
    }

    return true;
  }

  /**
   * Execute backup
   */
  public async executeBackup(profileId: string): Promise<{
    success: boolean;
    message: string;
    version?: BackupVersion;
  }> {
    try {
      const profile = this.profiles.get(profileId);
      if (!profile) {
        return { success: false, message: 'Profile not found' };
      }

      if (this.activeBackups.has(profileId)) {
        return { success: false, message: 'Backup already in progress' };
      }

      console.log('[BackupManager] Starting backup:', profile.name);
      this.activeBackups.add(profileId);

      // Simulate backup operation
      await new Promise(resolve => setTimeout(resolve, 2000));

      const version: BackupVersion = {
        id: `version-${Date.now()}`,
        profileId,
        timestamp: new Date(),
        size: Math.random() * 1024 * 1024 * 1024,
        fileCount: Math.floor(Math.random() * 1000),
        type: profile.options.incrementalBackup ? 'incremental' : 'full',
        compressed: profile.options.compressionEnabled,
        encrypted: profile.options.encryptionEnabled,
        status: 'success',
      };

      // Save version
      let versions = this.versions.get(profileId) || [];
      versions.unshift(version);

      // Apply retention policy
      if (profile.options.versioning && profile.options.maxVersions > 0) {
        versions = versions.slice(0, profile.options.maxVersions);
      }

      this.versions.set(profileId, versions);
      this.saveVersions();

      // Update profile statistics
      profile.statistics.totalBackups++;
      profile.statistics.successfulBackups++;
      profile.statistics.lastSize = version.size;
      profile.statistics.totalSize += version.size;
      profile.lastBackup = new Date();
      profile.nextBackup = this.calculateNextBackup(profile.schedule);
      this.saveProfiles();

      this.activeBackups.delete(profileId);

      return {
        success: true,
        message: 'Backup completed successfully',
        version,
      };
    } catch (error) {
      this.activeBackups.delete(profileId);
      console.error('[BackupManager] Backup error:', error);

      const profile = this.profiles.get(profileId);
      if (profile) {
        profile.statistics.failedBackups++;
        this.saveProfiles();
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Backup failed',
      };
    }
  }

  /**
   * Restore from backup
   */
  public async restoreBackup(
    versionId: string,
    options: RestoreOptions
  ): Promise<{ success: boolean; message: string; restoredFiles?: number }> {
    try {
      console.log('[BackupManager] Starting restore:', versionId);

      // Find version
      let version: BackupVersion | null = null;
      for (const versions of this.versions.values()) {
        const found = versions.find(v => v.id === versionId);
        if (found) {
          version = found;
          break;
        }
      }

      if (!version) {
        return { success: false, message: 'Version not found' };
      }

      // Simulate restore operation
      await new Promise(resolve => setTimeout(resolve, 2000));

      return {
        success: true,
        message: 'Restore completed successfully',
        restoredFiles: version.fileCount,
      };
    } catch (error) {
      console.error('[BackupManager] Restore error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Restore failed',
      };
    }
  }

  /**
   * Get versions for a profile
   */
  public getVersions(profileId: string): BackupVersion[] {
    return this.versions.get(profileId) || [];
  }

  /**
   * Delete version
   */
  public deleteVersion(versionId: string): boolean {
    for (const [profileId, versions] of this.versions.entries()) {
      const index = versions.findIndex(v => v.id === versionId);
      if (index !== -1) {
        versions.splice(index, 1);
        this.versions.set(profileId, versions);
        this.saveVersions();
        return true;
      }
    }
    return false;
  }

  /**
   * Schedule profile
   */
  private scheduleProfile(profileId: string): void {
    const profile = this.profiles.get(profileId);
    if (!profile || !profile.enabled) return;

    const { schedule } = profile;
    let interval: number;

    switch (schedule.type) {
      case 'interval':
        interval = (schedule.interval || 60) * 60 * 1000;
        break;
      case 'daily':
        interval = 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        interval = 7 * 24 * 60 * 60 * 1000;
        break;
      case 'monthly':
        interval = 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        return; // Manual backups don't need scheduling
    }

    const timer = setInterval(() => {
      this.executeBackup(profileId);
    }, interval);

    this.timers.set(profileId, timer);
    profile.nextBackup = this.calculateNextBackup(schedule);
    this.saveProfiles();

    console.log('[BackupManager] Scheduled profile:', profile.name);
  }

  /**
   * Unschedule profile
   */
  private unscheduleProfile(profileId: string): void {
    const timer = this.timers.get(profileId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(profileId);
    }
  }

  /**
   * Schedule all enabled profiles
   */
  private scheduleEnabledProfiles(): void {
    this.profiles.forEach(profile => {
      if (profile.enabled) {
        this.scheduleProfile(profile.id);
      }
    });
  }

  /**
   * Calculate next backup time
   */
  private calculateNextBackup(schedule: BackupSchedule): Date {
    const now = new Date();
    const next = new Date(now);

    switch (schedule.type) {
      case 'interval':
        next.setMinutes(next.getMinutes() + (schedule.interval || 60));
        break;
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
    }

    return next;
  }

  /**
   * Check if backup is active
   */
  public isBackupActive(profileId: string): boolean {
    return this.activeBackups.has(profileId);
  }

  /**
   * Format size
   */
  public formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Clear all data
   */
  public clearAll(): void {
    this.timers.forEach(timer => clearInterval(timer));
    this.timers.clear();
    this.profiles.clear();
    this.versions.clear();
    this.activeBackups.clear();
    localStorage.removeItem('backupProfiles');
    localStorage.removeItem('backupVersions');
  }
}

export const backupManager = BackupManagerClass.getInstance();
