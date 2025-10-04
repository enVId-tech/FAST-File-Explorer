import React, { useState, useEffect } from 'react';
import { archiveManager, ArchiveFormat } from '../../utils/ArchiveManager';
import './ArchiveDialog.scss';

interface ArchiveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPaths: string[];
  mode: 'create' | 'extract' | 'view';
  archivePath?: string;
}

export const ArchiveDialog: React.FC<ArchiveDialogProps> = ({
  isOpen,
  onClose,
  selectedPaths,
  mode,
  archivePath,
}) => {
  const [formats] = useState<ArchiveFormat[]>(archiveManager.getSupportedFormats());
  const [selectedFormat, setSelectedFormat] = useState('zip');
  const [destination, setDestination] = useState('');
  const [compressionLevel, setCompressionLevel] = useState(5);
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen && mode === 'create' && selectedPaths.length > 0) {
      const firstPath = selectedPaths[0];
      const baseName = firstPath.split(/[\\/]/).pop() || 'archive';
      setDestination(`${firstPath}.${selectedFormat}`);
    }
  }, [isOpen, mode, selectedPaths, selectedFormat]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!destination) {
      setMessage('Please specify destination path');
      return;
    }

    setWorking(true);
    setMessage('Creating archive...');

    const result = await archiveManager.createArchive(selectedPaths, destination, {
      format: selectedFormat,
      compressionLevel,
      password: password || undefined,
      includeSubfolders: true,
      preserveStructure: true,
    });

    setWorking(false);
    setMessage(result.message);

    if (result.success) {
      setTimeout(() => onClose(), 2000);
    }
  };

  const handleExtract = async () => {
    if (!archivePath || !destination) {
      setMessage('Please specify destination path');
      return;
    }

    setWorking(true);
    setMessage('Extracting archive...');

    const result = await archiveManager.extractArchive(archivePath, {
      destination,
      password: password || undefined,
      overwrite: true,
      createSubfolder: true,
    });

    setWorking(false);
    setMessage(result.message);

    if (result.success) {
      setTimeout(() => onClose(), 2000);
    }
  };

  return (
    <div className="archive-dialog-overlay" onClick={onClose}>
      <div className="archive-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="archive-dialog__header">
          <h2>
            {mode === 'create' ? '📦 Create Archive' : '📂 Extract Archive'}
          </h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="archive-dialog__content">
          {mode === 'create' ? (
            <>
              <div className="form-group">
                <label>Format</label>
                <select value={selectedFormat} onChange={(e) => setSelectedFormat(e.target.value)}>
                  {formats.map(format => (
                    <option key={format.extension} value={format.extension}>
                      {format.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Compression Level (0-9)</label>
                <input
                  type="range"
                  min="0"
                  max="9"
                  value={compressionLevel}
                  onChange={(e) => setCompressionLevel(Number(e.target.value))}
                />
                <span>{compressionLevel}</span>
              </div>

              <div className="form-group">
                <label>Password (optional)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty for no password"
                />
              </div>

              <div className="form-group">
                <label>Destination</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Archive file path"
                />
              </div>

              <div className="info-box">
                <p><strong>Source files:</strong> {selectedPaths.length}</p>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Archive</label>
                <input
                  type="text"
                  value={archivePath || ''}
                  readOnly
                />
              </div>

              <div className="form-group">
                <label>Password (if encrypted)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty if not encrypted"
                />
              </div>

              <div className="form-group">
                <label>Extract to</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Destination folder"
                />
              </div>
            </>
          )}

          {message && (
            <div className={`message ${working ? 'working' : ''}`}>
              {working && <span className="spinner" />}
              {message}
            </div>
          )}
        </div>

        <div className="archive-dialog__footer">
          <button onClick={onClose} disabled={working}>Cancel</button>
          <button
            className="primary"
            onClick={mode === 'create' ? handleCreate : handleExtract}
            disabled={working}
          >
            {mode === 'create' ? 'Create' : 'Extract'}
          </button>
        </div>
      </div>
    </div>
  );
};
