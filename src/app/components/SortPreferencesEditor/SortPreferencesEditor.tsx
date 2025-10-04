import React, { useState, useEffect } from 'react';
import { 
    FaSort, 
    FaSortAmountDown, 
    FaSortAmountUp, 
    FaTimes, 
    FaCheck, 
    FaStar, 
    FaPlus,
    FaTrash,
    FaEdit,
    FaFileDownload,
    FaFileUpload,
    FaUndo,
    FaCog
} from 'react-icons/fa';
import { 
    sortPreferencesManager, 
    SortPreference, 
    SortProfile, 
    SortCriteria 
} from '../../utils/SortPreferencesManager';
import { SortField, SortDirection } from '../FileUtils/fileUtils';
import './SortPreferencesEditor.scss';

interface SortPreferencesEditorProps {
    isOpen: boolean;
    onClose: () => void;
    currentPath?: string;
}

export const SortPreferencesEditor: React.FC<SortPreferencesEditorProps> = ({
    isOpen,
    onClose,
    currentPath
}) => {
    const [preferences, setPreferences] = useState<SortPreference[]>([]);
    const [profiles, setProfiles] = useState<SortProfile[]>([]);
    const [globalDefault, setGlobalDefault] = useState<SortPreference | null>(null);
    const [currentPreference, setCurrentPreference] = useState<SortPreference | null>(null);
    const [activeTab, setActiveTab] = useState<'current' | 'folders' | 'profiles'>('current');
    const [stats, setStats] = useState<any>(null);
    
    // Profile creation
    const [showProfileCreator, setShowProfileCreator] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [newProfileDesc, setNewProfileDesc] = useState('');
    const [newProfilePrimary, setNewProfilePrimary] = useState<SortCriteria>({
        field: 'name',
        direction: 'asc',
        algorithm: 'natural'
    });
    const [newProfileSecondary, setNewProfileSecondary] = useState<SortCriteria | null>(null);
    const [enableSecondary, setEnableSecondary] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadData();
            const unsubscribe = sortPreferencesManager.onChange(loadData);
            return unsubscribe;
        }
    }, [isOpen, currentPath]);

    const loadData = () => {
        const allPrefs = sortPreferencesManager.getAllFolderPreferences();
        setPreferences(allPrefs);
        setProfiles(sortPreferencesManager.getProfiles());
        setGlobalDefault(sortPreferencesManager.getGlobalDefault());
        setStats(sortPreferencesManager.getStats());

        if (currentPath) {
            const currentPref = sortPreferencesManager.getPreference(currentPath);
            setCurrentPreference(currentPref);
        }
    };

    const handleApplyProfile = (profileId: string, target: 'current' | 'global') => {
        if (target === 'current' && currentPath) {
            sortPreferencesManager.applyProfileToFolder(profileId, currentPath);
            alert('Profile applied to current folder!');
        } else if (target === 'global') {
            sortPreferencesManager.applyProfileAsGlobal(profileId);
            alert('Profile set as global default!');
        }
    };

    const handleRemovePreference = (folderPath: string) => {
        if (confirm(`Remove sort preference for: ${folderPath}?`)) {
            sortPreferencesManager.removeFolderPreference(folderPath);
        }
    };

    const handleDeleteProfile = (id: string) => {
        if (confirm('Delete this custom profile?')) {
            sortPreferencesManager.deleteProfile(id);
        }
    };

    const handleCreateProfile = () => {
        if (!newProfileName.trim()) {
            alert('Please enter a profile name');
            return;
        }

        const secondary = enableSecondary ? newProfileSecondary : undefined;
        sortPreferencesManager.createProfile(
            newProfileName,
            newProfileDesc,
            newProfilePrimary,
            secondary || undefined
        );

        // Reset form
        setNewProfileName('');
        setNewProfileDesc('');
        setNewProfilePrimary({ field: 'name', direction: 'asc', algorithm: 'natural' });
        setNewProfileSecondary(null);
        setEnableSecondary(false);
        setShowProfileCreator(false);
        alert('Custom profile created!');
    };

    const handleExport = () => {
        const json = sortPreferencesManager.export();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sort-preferences-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const json = e.target?.result as string;
                    if (sortPreferencesManager.import(json)) {
                        alert('Sort preferences imported successfully!');
                    } else {
                        alert('Failed to import. Invalid format.');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    const handleReset = () => {
        sortPreferencesManager.resetToDefaults();
    };

    const renderCriteria = (criteria: SortCriteria, label: string = '') => (
        <div className="criteria-display">
            {label && <span className="criteria-label">{label}:</span>}
            <span className="criteria-field">{criteria.field}</span>
            <span className="criteria-direction">
                {criteria.direction === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />}
            </span>
            {criteria.algorithm && criteria.algorithm !== 'natural' && (
                <span className="criteria-algorithm">({criteria.algorithm})</span>
            )}
        </div>
    );

    const renderCurrentTab = () => (
        <div className="tab-content">
            <div className="section">
                <h3>Current Folder</h3>
                {currentPath ? (
                    <>
                        <div className="folder-path">{currentPath}</div>
                        {currentPreference && (
                            <div className="preference-card">
                                {renderCriteria(currentPreference.primary, 'Primary')}
                                {currentPreference.secondary && renderCriteria(currentPreference.secondary, 'Secondary')}
                                <div className="preference-meta">
                                    {currentPreference.isGlobal ? (
                                        <span className="badge global">Global Default</span>
                                    ) : (
                                        <span className="badge folder">Folder-Specific</span>
                                    )}
                                </div>
                                {!currentPreference.isGlobal && (
                                    <button 
                                        className="btn-remove"
                                        onClick={() => handleRemovePreference(currentPath)}
                                    >
                                        <FaTimes /> Remove Preference
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <p className="empty-message">No folder selected</p>
                )}
            </div>

            <div className="section">
                <h3>Quick Apply Profile</h3>
                <div className="profile-quick-list">
                    {profiles.slice(0, 6).map(profile => (
                        <div key={profile.id} className="profile-quick-item">
                            <div className="profile-info">
                                <div className="profile-name">
                                    {profile.isBuiltIn && <FaStar className="builtin-icon" />}
                                    {profile.name}
                                </div>
                                <div className="profile-criteria">
                                    {renderCriteria(profile.primary)}
                                </div>
                            </div>
                            {currentPath && (
                                <button
                                    className="btn-apply"
                                    onClick={() => handleApplyProfile(profile.id, 'current')}
                                >
                                    <FaCheck /> Apply
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderFoldersTab = () => (
        <div className="tab-content">
            <div className="section">
                <div className="section-header">
                    <h3>Global Default</h3>
                    <button className="btn-secondary" onClick={() => setActiveTab('profiles')}>
                        Change Default
                    </button>
                </div>
                {globalDefault && (
                    <div className="preference-card global-card">
                        {renderCriteria(globalDefault.primary, 'Primary')}
                        {globalDefault.secondary && renderCriteria(globalDefault.secondary, 'Secondary')}
                    </div>
                )}
            </div>

            <div className="section">
                <div className="section-header">
                    <h3>Folder-Specific Preferences ({preferences.length})</h3>
                    {preferences.length > 0 && (
                        <button
                            className="btn-danger"
                            onClick={() => sortPreferencesManager.clearAllFolderPreferences()}
                        >
                            <FaTrash /> Clear All
                        </button>
                    )}
                </div>
                {preferences.length === 0 ? (
                    <p className="empty-message">No folder-specific preferences set</p>
                ) : (
                    <div className="preferences-list">
                        {preferences.map(pref => (
                            <div key={pref.id} className="preference-item">
                                <div className="preference-path">{pref.folderPath}</div>
                                <div className="preference-details">
                                    {renderCriteria(pref.primary)}
                                    {pref.secondary && <> • {renderCriteria(pref.secondary)}</>}
                                </div>
                                <button
                                    className="btn-icon"
                                    onClick={() => handleRemovePreference(pref.folderPath)}
                                    title="Remove"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {stats && (
                <div className="section stats-section">
                    <h3>Statistics</h3>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-value">{stats.totalPreferences}</div>
                            <div className="stat-label">Folder Preferences</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{stats.mostUsedField}</div>
                            <div className="stat-label">Most Used Field</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{stats.mostUsedAlgorithm}</div>
                            <div className="stat-label">Most Used Algorithm</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderProfilesTab = () => (
        <div className="tab-content">
            <div className="section">
                <div className="section-header">
                    <h3>Built-in Profiles</h3>
                </div>
                <div className="profiles-grid">
                    {profiles.filter(p => p.isBuiltIn).map(profile => (
                        <div key={profile.id} className="profile-card builtin">
                            <div className="profile-header">
                                <FaStar className="profile-icon" />
                                <h4>{profile.name}</h4>
                            </div>
                            <p className="profile-description">{profile.description}</p>
                            <div className="profile-criteria">
                                {renderCriteria(profile.primary, 'Primary')}
                                {profile.secondary && renderCriteria(profile.secondary, 'Secondary')}
                            </div>
                            <div className="profile-actions">
                                {currentPath && (
                                    <button
                                        className="btn-primary"
                                        onClick={() => handleApplyProfile(profile.id, 'current')}
                                    >
                                        Apply to Folder
                                    </button>
                                )}
                                <button
                                    className="btn-secondary"
                                    onClick={() => handleApplyProfile(profile.id, 'global')}
                                >
                                    Set as Default
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="section">
                <div className="section-header">
                    <h3>Custom Profiles ({profiles.filter(p => !p.isBuiltIn).length})</h3>
                    <button className="btn-primary" onClick={() => setShowProfileCreator(!showProfileCreator)}>
                        <FaPlus /> Create Profile
                    </button>
                </div>

                {showProfileCreator && (
                    <div className="profile-creator">
                        <h4>Create Custom Profile</h4>
                        <div className="form-group">
                            <label>Profile Name</label>
                            <input
                                type="text"
                                value={newProfileName}
                                onChange={(e) => setNewProfileName(e.target.value)}
                                placeholder="My Custom Sort"
                            />
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <input
                                type="text"
                                value={newProfileDesc}
                                onChange={(e) => setNewProfileDesc(e.target.value)}
                                placeholder="Description of this sort profile"
                            />
                        </div>
                        <div className="form-group">
                            <label>Primary Sort</label>
                            <div className="criteria-builder">
                                <select
                                    value={newProfilePrimary.field}
                                    onChange={(e) => setNewProfilePrimary({ ...newProfilePrimary, field: e.target.value as SortField })}
                                >
                                    <option value="name">Name</option>
                                    <option value="modified">Modified Date</option>
                                    <option value="size">Size</option>
                                    <option value="type">Type</option>
                                </select>
                                <select
                                    value={newProfilePrimary.direction}
                                    onChange={(e) => setNewProfilePrimary({ ...newProfilePrimary, direction: e.target.value as SortDirection })}
                                >
                                    <option value="asc">Ascending</option>
                                    <option value="desc">Descending</option>
                                </select>
                                <select
                                    value={newProfilePrimary.algorithm || 'natural'}
                                    onChange={(e) => setNewProfilePrimary({ ...newProfilePrimary, algorithm: e.target.value as any })}
                                >
                                    <option value="natural">Natural</option>
                                    <option value="alphabetical">Alphabetical</option>
                                    <option value="case-sensitive">Case Sensitive</option>
                                    <option value="case-insensitive">Case Insensitive</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={enableSecondary}
                                    onChange={(e) => {
                                        setEnableSecondary(e.target.checked);
                                        if (e.target.checked && !newProfileSecondary) {
                                            setNewProfileSecondary({ field: 'name', direction: 'asc', algorithm: 'natural' });
                                        }
                                    }}
                                />
                                Enable Secondary Sort
                            </label>
                        </div>
                        {enableSecondary && newProfileSecondary && (
                            <div className="form-group">
                                <label>Secondary Sort</label>
                                <div className="criteria-builder">
                                    <select
                                        value={newProfileSecondary.field}
                                        onChange={(e) => setNewProfileSecondary({ ...newProfileSecondary, field: e.target.value as SortField })}
                                    >
                                        <option value="name">Name</option>
                                        <option value="modified">Modified Date</option>
                                        <option value="size">Size</option>
                                        <option value="type">Type</option>
                                    </select>
                                    <select
                                        value={newProfileSecondary.direction}
                                        onChange={(e) => setNewProfileSecondary({ ...newProfileSecondary, direction: e.target.value as SortDirection })}
                                    >
                                        <option value="asc">Ascending</option>
                                        <option value="desc">Descending</option>
                                    </select>
                                    <select
                                        value={newProfileSecondary.algorithm || 'natural'}
                                        onChange={(e) => setNewProfileSecondary({ ...newProfileSecondary, algorithm: e.target.value as any })}
                                    >
                                        <option value="natural">Natural</option>
                                        <option value="alphabetical">Alphabetical</option>
                                        <option value="case-sensitive">Case Sensitive</option>
                                        <option value="case-insensitive">Case Insensitive</option>
                                    </select>
                                </div>
                            </div>
                        )}
                        <div className="form-actions">
                            <button className="btn-primary" onClick={handleCreateProfile}>
                                <FaCheck /> Create Profile
                            </button>
                            <button className="btn-secondary" onClick={() => setShowProfileCreator(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                <div className="profiles-grid">
                    {profiles.filter(p => !p.isBuiltIn).map(profile => (
                        <div key={profile.id} className="profile-card custom">
                            <div className="profile-header">
                                <h4>{profile.name}</h4>
                                <button
                                    className="btn-icon danger"
                                    onClick={() => handleDeleteProfile(profile.id)}
                                    title="Delete"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                            <p className="profile-description">{profile.description}</p>
                            <div className="profile-criteria">
                                {renderCriteria(profile.primary, 'Primary')}
                                {profile.secondary && renderCriteria(profile.secondary, 'Secondary')}
                            </div>
                            <div className="profile-actions">
                                {currentPath && (
                                    <button
                                        className="btn-primary"
                                        onClick={() => handleApplyProfile(profile.id, 'current')}
                                    >
                                        Apply to Folder
                                    </button>
                                )}
                                <button
                                    className="btn-secondary"
                                    onClick={() => handleApplyProfile(profile.id, 'global')}
                                >
                                    Set as Default
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <div className="sort-preferences-overlay" onClick={onClose}>
            <div className="sort-preferences-editor" onClick={(e) => e.stopPropagation()}>
                <div className="editor-header">
                    <h2><FaCog /> Sort Preferences</h2>
                    <button className="close-btn" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="editor-tabs">
                    <button
                        className={`tab ${activeTab === 'current' ? 'active' : ''}`}
                        onClick={() => setActiveTab('current')}
                    >
                        Current Folder
                    </button>
                    <button
                        className={`tab ${activeTab === 'folders' ? 'active' : ''}`}
                        onClick={() => setActiveTab('folders')}
                    >
                        All Folders
                    </button>
                    <button
                        className={`tab ${activeTab === 'profiles' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profiles')}
                    >
                        Profiles
                    </button>
                </div>

                <div className="editor-body">
                    {activeTab === 'current' && renderCurrentTab()}
                    {activeTab === 'folders' && renderFoldersTab()}
                    {activeTab === 'profiles' && renderProfilesTab()}
                </div>

                <div className="editor-footer">
                    <button className="btn-secondary" onClick={handleExport}>
                        <FaFileDownload /> Export
                    </button>
                    <button className="btn-secondary" onClick={handleImport}>
                        <FaFileUpload /> Import
                    </button>
                    <button className="btn-danger" onClick={handleReset}>
                        <FaUndo /> Reset to Defaults
                    </button>
                </div>
            </div>
        </div>
    );
};
