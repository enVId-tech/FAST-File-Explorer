import React, { useEffect } from 'react';
import './main.scss';

export default function Main(): React.JSX.Element {
    const runTestIPC = async () => {
        try {
            const response = await window.electronAPI.testAPI();
            console.log('Response from main process:', response);
        } catch (error) {
            console.error('Error calling test IPC:', error);
        }
    };


    useEffect(() => {
        // This effect runs once when the component mounts
        runTestIPC().then(() => {
            console.log('Test IPC call completed');
        }).catch((error) => {
            console.error('Error during IPC call:', error);
        });
    }, []);

    return (
        <div className="main-container">
            <h1>Welcome to Fast File Explorer</h1>
            <p>This is the main application interface.</p>
        </div>
    );
}