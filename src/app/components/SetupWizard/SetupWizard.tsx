import React, { useState, useCallback } from 'react';
import { FaRocket, FaWindows, FaLinux, FaCheck, FaTimes, FaArrowRight, FaArrowLeft, FaCog } from 'react-icons/fa';
import './SetupWizard.scss';

interface SetupWizardProps {
    isOpen: boolean;
    onComplete: (settings: SetupSettings) => void;
    onSkip: () => void;
}

interface SetupSettings {
    explorerMode: 'windows' | 'fast';
    installWSL: boolean;
    enableFileTransfers: boolean;
    enableCustomContextMenu: boolean;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ isOpen, onComplete, onSkip }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [settings, setSettings] = useState<SetupSettings>({
        explorerMode: 'fast',
        installWSL: false,
        enableFileTransfers: false,
        enableCustomContextMenu: true,
    });

    const steps = [
        {
            id: 'welcome',
            title: 'Welcome to FAST File Explorer',
            subtitle: 'Let\'s get you set up with the best experience',
            component: WelcomeStep,
        },
        {
            id: 'explorer-mode',
            title: 'Choose Explorer Mode',
            subtitle: 'Select how you want the file explorer to behave',
            component: ExplorerModeStep,
        },
        {
            id: 'performance',
            title: 'Performance Options',
            subtitle: 'Enable optional performance features',
            component: PerformanceStep,
        },
        {
            id: 'features',
            title: 'Additional Features',
            subtitle: 'Enable experimental features',
            component: FeaturesStep,
        },
        {
            id: 'complete',
            title: 'Setup Complete',
            subtitle: 'You\'re all set! You can change these settings later.',
            component: CompleteStep,
        },
    ];

    const handleNext = useCallback(() => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete(settings);
        }
    }, [currentStep, settings, onComplete]);

    const handlePrevious = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    }, [currentStep]);

    const updateSetting = useCallback(<K extends keyof SetupSettings>(key: K, value: SetupSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    }, []);

    if (!isOpen) return null;

    const CurrentStepComponent = steps[currentStep].component;

    return (
        <div className="setup-wizard-overlay">
            <div className="setup-wizard">
                <div className="setup-header">
                    <div className="setup-progress">
                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                className={`progress-dot ${index <= currentStep ? 'active' : ''} ${index === currentStep ? 'current' : ''}`}
                            />
                        ))}
                    </div>
                    <h2>{steps[currentStep].title}</h2>
                    <p>{steps[currentStep].subtitle}</p>
                </div>

                <div className="setup-content">
                    <CurrentStepComponent
                        settings={settings}
                        updateSetting={updateSetting}
                    />
                </div>

                <div className="setup-footer">
                    <div className="setup-actions">
                        {currentStep > 0 && (
                            <button
                                className="setup-button secondary"
                                onClick={handlePrevious}
                            >
                                <FaArrowLeft />
                                Previous
                            </button>
                        )}
                        
                        <div className="spacer" />
                        
                        {currentStep === 0 && (
                            <button
                                className="setup-button secondary"
                                onClick={onSkip}
                            >
                                Skip Setup
                            </button>
                        )}
                        
                        <button
                            className="setup-button primary"
                            onClick={handleNext}
                        >
                            {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                            {currentStep !== steps.length - 1 && <FaArrowRight />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Step Components
const WelcomeStep: React.FC<{
    settings: SetupSettings;
    updateSetting: <K extends keyof SetupSettings>(key: K, value: SetupSettings[K]) => void;
}> = () => (
    <div className="setup-step welcome-step">
        <div className="welcome-icon">
            <FaRocket />
        </div>
        <h3>Get Ready for Lightning-Fast File Management</h3>
        <p>
            FAST File Explorer offers advanced features and performance improvements
            over the standard Windows Explorer. Let's configure it to work best for you.
        </p>
        <div className="feature-highlights">
            <div className="feature">
                <FaCheck className="feature-icon" />
                <span>Virtualized lists for smooth scrolling</span>
            </div>
            <div className="feature">
                <FaCheck className="feature-icon" />
                <span>Advanced file transfer monitoring</span>
            </div>
            <div className="feature">
                <FaCheck className="feature-icon" />
                <span>Customizable interface</span>
            </div>
        </div>
    </div>
);

const ExplorerModeStep: React.FC<{
    settings: SetupSettings;
    updateSetting: <K extends keyof SetupSettings>(key: K, value: SetupSettings[K]) => void;
}> = ({ settings, updateSetting }) => (
    <div className="setup-step explorer-mode-step">
        <h3>Choose Your Explorer Experience</h3>
        <p>Select how you want the file explorer to behave:</p>
        
        <div className="mode-options">
            <div
                className={`mode-option ${settings.explorerMode === 'windows' ? 'selected' : ''}`}
                onClick={() => updateSetting('explorerMode', 'windows')}
            >
                <FaWindows className="mode-icon" />
                <h4>Windows Default</h4>
                <p>Familiar Windows Explorer behavior with standard features</p>
                <div className="pros-cons">
                    <div className="pros">
                        <strong>Pros:</strong> Familiar, compatible with all Windows features
                    </div>
                    <div className="cons">
                        <strong>Cons:</strong> Slower performance, limited customization
                    </div>
                </div>
            </div>
            
            <div
                className={`mode-option ${settings.explorerMode === 'fast' ? 'selected' : ''}`}
                onClick={() => updateSetting('explorerMode', 'fast')}
            >
                <FaRocket className="mode-icon" />
                <h4>FAST Mode (Recommended)</h4>
                <p>Enhanced performance with modern UI and advanced features</p>
                <div className="pros-cons">
                    <div className="pros">
                        <strong>Pros:</strong> Faster performance, modern UI, advanced features
                    </div>
                    <div className="cons">
                        <strong>Cons:</strong> Some Windows integrations may differ
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const PerformanceStep: React.FC<{
    settings: SetupSettings;
    updateSetting: <K extends keyof SetupSettings>(key: K, value: SetupSettings[K]) => void;
}> = ({ settings, updateSetting }) => (
    <div className="setup-step performance-step">
        <h3>Performance Optimizations</h3>
        <p>Enable optional features that can improve performance:</p>
        
        <div className="option-card">
            <div className="option-header">
                <FaLinux className="option-icon" />
                <div>
                    <h4>Install WSL for Faster File Operations</h4>
                    <p>Use Windows Subsystem for Linux for improved file transfer speeds</p>
                </div>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={settings.installWSL}
                        onChange={(e) => updateSetting('installWSL', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                </label>
            </div>
            <div className="option-details">
                <p>
                    <strong>Benefits:</strong> Up to 30% faster file transfers, better handling of large files
                    <br />
                    <strong>Requirements:</strong> Windows 10/11, requires system restart
                </p>
            </div>
        </div>
    </div>
);

const FeaturesStep: React.FC<{
    settings: SetupSettings;
    updateSetting: <K extends keyof SetupSettings>(key: K, value: SetupSettings[K]) => void;
}> = ({ settings, updateSetting }) => (
    <div className="setup-step features-step">
        <h3>Experimental Features</h3>
        <p>Enable preview features that are still in development:</p>
        
        <div className="option-card">
            <div className="option-header">
                <FaCog className="option-icon" />
                <div>
                    <h4>Advanced File Transfer UI</h4>
                    <p>Enhanced file transfer monitoring with detailed progress</p>
                </div>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={settings.enableFileTransfers}
                        onChange={(e) => updateSetting('enableFileTransfers', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                </label>
            </div>
        </div>
        
        <div className="option-card">
            <div className="option-header">
                <FaCog className="option-icon" />
                <div>
                    <h4>Custom Context Menu</h4>
                    <p>Modern right-click menu with enhanced features</p>
                </div>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={settings.enableCustomContextMenu}
                        onChange={(e) => updateSetting('enableCustomContextMenu', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                </label>
            </div>
        </div>
    </div>
);

const CompleteStep: React.FC<{
    settings: SetupSettings;
    updateSetting: <K extends keyof SetupSettings>(key: K, value: SetupSettings[K]) => void;
}> = ({ settings }) => (
    <div className="setup-step complete-step">
        <div className="complete-icon">
            <FaCheck />
        </div>
        <h3>Setup Complete!</h3>
        <p>Your FAST File Explorer is now configured with the following settings:</p>
        
        <div className="settings-summary">
            <div className="summary-item">
                <strong>Explorer Mode:</strong> {settings.explorerMode === 'fast' ? 'FAST Mode' : 'Windows Default'}
            </div>
            <div className="summary-item">
                <strong>WSL Installation:</strong> {settings.installWSL ? 'Enabled' : 'Disabled'}
            </div>
            <div className="summary-item">
                <strong>File Transfer UI:</strong> {settings.enableFileTransfers ? 'Enabled' : 'Disabled'}
            </div>
            <div className="summary-item">
                <strong>Custom Context Menu:</strong> {settings.enableCustomContextMenu ? 'Enabled' : 'Disabled'}
            </div>
        </div>
        
        <p className="complete-note">
            You can change any of these settings later in the Setup tab of the settings menu.
        </p>
    </div>
);
