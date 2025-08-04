export function handleMinimize() {
    window.electronAPI.window.minimize();
};

export function handleMaximize(isMaximized: boolean, setIsMaximized: (value: boolean) => void) {
    if (isMaximized) {
        window.electronAPI.window.unmaximize();
        setIsMaximized(false);
    } else {
        window.electronAPI.window.maximize();
        setIsMaximized(true);
    }
};

export function handleClose() {
    window.electronAPI.window.close();
};