import React, { useState, useEffect } from 'react';
import { cloudIntegrationManager, CloudProvider, CloudAccount } from '../../utils/CloudIntegrationManager';
import './CloudDialog.scss';

interface CloudDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudDialog: React.FC<CloudDialogProps> = ({ isOpen, onClose }) => {
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider>('onedrive');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  const loadAccounts = () => {
    setAccounts(cloudIntegrationManager.getAccounts());
  };

  const handleConnect = async () => {
    setWorking(true);
    setMessage('Connecting...');

    const result = await cloudIntegrationManager.connect(selectedProvider);
    
    setWorking(false);
    setMessage(result.message);
    
    if (result.success) {
      loadAccounts();
    }
  };

  const handleDisconnect = async (accountId: string) => {
    const result = await cloudIntegrationManager.disconnect(accountId);
    setMessage(result.message);
    if (result.success) {
      loadAccounts();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cloud-dialog-overlay" onClick={onClose}>
      <div className="cloud-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="cloud-dialog__header">
          <h2>☁️ Cloud Integration</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="cloud-dialog__content">
          <div className="connect-section">
            <h3>Connect New Account</h3>
            <div className="form-group">
              <select value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value as CloudProvider)}>
                <option value="onedrive">☁️ OneDrive</option>
                <option value="dropbox">📦 Dropbox</option>
                <option value="googledrive">🔷 Google Drive</option>
              </select>
              <button onClick={handleConnect} disabled={working}>Connect</button>
            </div>
          </div>

          {accounts.length > 0 && (
            <div className="accounts-section">
              <h3>Connected Accounts</h3>
              {accounts.map(account => (
                <div key={account.id} className="account-card">
                  <div className="account-info">
                    <span className="icon">{cloudIntegrationManager.getProviderIcon(account.provider)}</span>
                    <div>
                      <div className="name">{account.displayName}</div>
                      <div className="email">{account.email}</div>
                      {account.quota && (
                        <div className="quota">
                          {cloudIntegrationManager.formatQuota(account.quota.used, account.quota.total)}
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => handleDisconnect(account.id)} className="disconnect-btn">
                    Disconnect
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
