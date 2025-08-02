import React, { useEffect } from 'react';
import 'main.scss';

export default function Main(): React.JSX.Element {
    useEffect(() => {
        // This effect runs once when the component mounts
        const runTestIPC = async () => {
            try {
                const response = await window.electronAPI.testAPI('Hello from renderer');
                console.log('Response from main process:', response);
            } catch (error) {
                console.error('Error calling test IPC:', error);
            }
        };

        runTestIPC();
    }, []);

    return (
        <div className="main-container">
            <h1>Welcome to Fast File Explorer</h1>
            <p>This is the main application interface.</p>
        </div>
    );
}