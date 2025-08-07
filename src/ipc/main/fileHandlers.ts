import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';

const getFilePath = (fileName: string): string => {
    return path.join(os.homedir(), fileName);
}

const fileExists = (fileName: string): Promise<boolean> => {
    return new Promise((resolve) => {
        fs.access(getFilePath(fileName), fs.constants.F_OK, (err) => {
            resolve(!err);
        });
    });
}

export default function initializeFileHandlers() {}