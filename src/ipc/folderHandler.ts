import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';

const getFolderPath = (folderName: string): string => {
    return path.join(os.homedir(), folderName);
}

const getFolderContents = (folderPath: string): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                reject(err);
            } else {
                resolve(files);
            }
        });
    });
}

const getFolderMetadata = (folderPath: string): Promise<fs.Stats> => {
    return new Promise((resolve, reject) => {
        fs.stat(folderPath, (err, stats) => {
            if (err) {
                reject(err);
            } else {
                resolve(stats);
            }
        });
    });
}

const folderExists = (folderPath: string): Promise<boolean> => {
    return new Promise((resolve) => {
        fs.access(folderPath, fs.constants.F_OK, (err) => {
            resolve(!err);
        });
    });
}

export default function initializeFolderHandlers() {
    console.log('Initializing folder handlers...');

    ipcMain.handle('folder-get-all', async (event, folderPath: string) => {
        console.log(`Received folder-get-all request for: ${folderPath}`);

        if (!await folderExists(folderPath)) {
            throw new Error(`Folder "${folderPath}" does not exist.`);
        }

        console.log(`Fetching contents for folder: ${folderPath}`);

        // Get all files and folders in the specified folder
        const contents = await getFolderContents(folderPath);
        console.log(`Contents of folder ${folderPath}:`, contents);
        if (contents.length === 0) {
            console.log(`No contents found in folder: ${folderPath}`);
            return [];
        }
        return contents;
    });

    ipcMain.handle('folder-get', async (event, folderPath: string) => {
        console.log(`Received folder-get request for: ${folderPath}`);

        if (!await folderExists(folderPath)) {
            throw new Error(`Folder "${folderPath}" does not exist.`);
        }

        console.log(`Fetching metadata for folder: ${folderPath}`);

        return getFolderMetadata(folderPath);
    });

    console.log('Folder handlers registered successfully');
}