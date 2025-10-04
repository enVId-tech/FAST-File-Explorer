import { exec } from 'child_process';
import { promisify } from 'util';
import { app } from 'electron';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Check if the application is running with administrator privileges on Windows
 */
export async function isRunningAsAdmin(): Promise<boolean> {
    if (process.platform !== 'win32') {
        return true; // Non-Windows platforms don't need elevation for drive rename
    }

    try {
        // Try to access a registry key that requires admin privileges
        await execAsync('net session', { timeout: 1000 });
        return true;
    } catch {
        return false;
    }
}

/**
 * Restart the application with administrator privileges
 * @param args - Optional arguments to pass to the elevated process
 */
export async function restartAsAdmin(args: string[] = []): Promise<void> {
    if (process.platform !== 'win32') {
        throw new Error('UAC elevation is only supported on Windows');
    }

    try {
        let commandToRun: string;
        
        if (app.isPackaged) {
            // Production mode - launch the executable directly
            const exePath = process.execPath;
            const argsList = args.length > 0 ? ` -ArgumentList "${args.join(' ')}"` : '';
            commandToRun = `Start-Process -FilePath "${exePath}" -Verb RunAs${argsList}`;
        } else {
            // Development mode - need to launch with npm run dev or electron
            const appPath = app.getAppPath();
            
            // Try to restart using npm run dev
            // This will show a console window but is the most reliable method in dev mode
            const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
            // ArgumentList needs comma-separated values for multiple arguments
            commandToRun = `Start-Process -FilePath "${npmCmd}" -ArgumentList "run","dev" -WorkingDirectory "${appPath}" -Verb RunAs`;
            
            // Alternative: Could also try to find the main entry point
            // But npm run dev is more reliable as it handles all the build steps
        }

        console.log('Executing elevation command:', commandToRun);

        // Execute the elevation command
        await execAsync(`powershell -Command "${commandToRun}"`, {
            timeout: 10000,
            windowsHide: false // Show window in dev mode for debugging
        });

        // Quit the current non-elevated instance
        // Small delay to ensure the elevated instance starts
        setTimeout(() => {
            app.quit();
        }, 500);
    } catch (error) {
        console.error('Failed to restart as administrator:', error);
        throw new Error('Failed to request administrator privileges. The user may have declined the UAC prompt.');
    }
}

/**
 * Prompt user to restart the application with administrator privileges
 * Shows a native Windows UAC dialog
 */
export async function promptForElevation(reason: string = 'This operation requires administrator privileges'): Promise<boolean> {
    const { dialog } = require('electron');
    
    // Check if we're in development mode
    const isDev = !app.isPackaged;
    
    const detailMessage = isDev 
        ? 'The application needs to restart with administrator privileges to perform this operation.\n\n' +
          'Development Mode: You will need to manually restart the application as administrator.\n' +
          '• Close this application\n' +
          '• Right-click your terminal/IDE and select "Run as administrator"\n' +
          '• Run "npm run dev" again\n\n' +
          'Or click "Restart as Administrator" to attempt automatic restart (may require additional setup).'
        : 'The application needs to restart with administrator privileges to perform this operation.\n\n' +
          'Click "Restart as Administrator" to continue, or "Cancel" to abort.';
    
    const result = await dialog.showMessageBox({
        type: 'warning',
        title: 'Administrator Privileges Required',
        message: reason,
        detail: detailMessage,
        buttons: isDev 
            ? ['Restart as Administrator', 'Cancel', 'Copy Instructions']
            : ['Restart as Administrator', 'Cancel'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
    });

    if (isDev && result.response === 2) {
        // Copy instructions to clipboard
        const { clipboard } = require('electron');
        clipboard.writeText(
            'To run FAST File Explorer with administrator privileges:\n\n' +
            '1. Close the current application\n' +
            '2. Right-click your terminal or IDE\n' +
            '3. Select "Run as administrator"\n' +
            '4. Navigate to the project folder\n' +
            '5. Run: npm run dev\n\n' +
            'Then you can perform drive rename operations.'
        );
        await dialog.showMessageBox({
            type: 'info',
            title: 'Instructions Copied',
            message: 'The instructions have been copied to your clipboard.',
            buttons: ['OK']
        });
        return false;
    }

    if (result.response === 0) {
        try {
            await restartAsAdmin();
            return true;
        } catch (error) {
            console.error('Elevation failed:', error);
            
            // Show more helpful error in dev mode
            if (isDev) {
                await dialog.showMessageBox({
                    type: 'error',
                    title: 'Elevation Failed',
                    message: 'Could not restart with administrator privileges',
                    detail: 'In development mode, automatic elevation may not work correctly.\n\n' +
                            'Please manually restart your terminal/IDE as administrator and run "npm run dev" again.',
                    buttons: ['OK']
                });
            }
            
            return false;
        }
    }

    return false;
}

/**
 * Check if running as admin, and if not, offer to restart with elevation
 */
export async function ensureAdminPrivileges(reason: string = 'This operation requires administrator privileges'): Promise<boolean> {
    const isAdmin = await isRunningAsAdmin();
    
    if (isAdmin) {
        return true;
    }

    return await promptForElevation(reason);
}
