import React, { createContext, useContext, useState, useCallback } from 'react';

interface NavigationState {
    currentPath: string;
    currentView: 'thispc' | 'recents' | 'folder';
}

interface NavigationContextType extends NavigationState {
    navigateToPath: (path: string) => void;
    setCurrentView: (view: 'thispc' | 'recents' | 'folder') => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentPath, setCurrentPath] = useState<string>('');
    const [currentView, setCurrentView] = useState<'thispc' | 'recents' | 'folder'>('thispc');

    const navigateToPath = useCallback((path: string) => {
        setCurrentPath(path);
        setCurrentView('folder');
    }, []);

    const value: NavigationContextType = {
        currentPath,
        currentView,
        navigateToPath,
        setCurrentView
    };

    return (
        <NavigationContext.Provider value={value}>
            {children}
        </NavigationContext.Provider>
    );
};

export const useNavigation = () => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
};
