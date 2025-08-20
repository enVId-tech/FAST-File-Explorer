import React, { createContext, useContext } from 'react';
import { useNavigation as useNavigationInternal } from '../utils/NavigationUtils';

// Provide a single shared navigation state across the app by wrapping the
// richer navigation hook from utils in a React context.

type NavigationContextType = ReturnType<typeof useNavigationInternal>;

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const navigation = useNavigationInternal();

    return (
        <NavigationContext.Provider value={navigation}>
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
