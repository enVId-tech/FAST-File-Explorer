import React, { useState, useEffect } from 'react';
import { backupManager, BackupProfile } from '../../utils/BackupManager';
import './BackupDialog.scss';

interface BackupDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupDialog: React.FC<BackupDialogProps> = ({ isOpen, onClose }) => {
  const [profiles, setProfiles] = useState<BackupProfile[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    }
  }, [isOpen]);

  const loadProfiles = () => {
    setProfiles(backupManager.getProfiles());
  };

  const handleBackupNow = async (profileId: string) => {
    setMessage('Running backup...');
    const result = await backupManager.executeBackup(profileId);
    setMessage(result.message);
    loadProfiles();
  };

  const handleToggleProfile = (profileId: string, enabled: boolean) => {
    backupManager.setProfileEnabled(profileId, enabled);
    loadProfiles();
  };

  if (!isOpen) return null;

  return (
    <div className="backup-dialog-overlay" onClick={onClose}>
      <div className="backup-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="backup-dialog__header">
          <h2>💾 Backup & Sync</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="backup-dialog__content">
          {profiles.length === 0 ? (
            <div className="empty-state">
              <p>No backup profiles configured</p>
              <p className="hint">Create backup profiles to protect your data</p>
            </div>
          ) : (
            <div className="profiles-list">
              {profiles.map(profile => (
                <div key={profile.id} className="profile-card">
                  <div className="profile-header">
                    <h3>{profile.name}</h3>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={profile.enabled}
                        onChange={(e) => handleToggleProfile(profile.id, e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <div className="profile-info">
                    <div className="info-row">
                      <span>Sources:</span>
                      <strong>{profile.sourcePaths.length} path(s)</strong>
                    </div>
                    <div className="info-row">
                      <span>Total backups:</span>
                      <strong>{profile.statistics.totalBackups}</strong>
                    </div>
                    <div className="info-row">
                      <span>Last backup:</span>
                      <strong>
                        {profile.lastBackup ? profile.lastBackup.toLocaleString() : 'Never'}
                      </strong>
                    </div>
                  </div>
                  <button
                    className="backup-now-btn"
                    onClick={() => handleBackupNow(profile.id)}
                    disabled={backupManager.isBackupActive(profile.id)}
                  >
                    {backupManager.isBackupActive(profile.id) ? 'Backing up...' : 'Backup Now'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {message && <div className="message">{message}</div>}
        </div>
      </div>
    </div>
  );
};
