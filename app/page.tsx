"use client";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core"; 
import { open } from "@tauri-apps/plugin-dialog";
import { platform } from '@tauri-apps/plugin-os';

function formatPathForRsync(windowsPath: string): string {
  let unixPath = windowsPath.replace(/\\/g, '/');

  unixPath = unixPath.replace(/^([a-zA-Z]):/, (match, drive) => {
    return `/cygdrive/${drive.toLowerCase()}`;
  });

  if (!unixPath.endsWith('/')) {
    unixPath += '/';
  }

  return unixPath;
}

function App() {
  const [count, setCount] = useState(0);

  async function transferFile() {
    let sendPath = await open({
      directory: true,
      multiple: false,
    });

    if (!sendPath) {
      console.log("No directory selected.");
      return;
    }

    let destPath = await open({
      directory: true,
      multiple: false,
    });

    if (!destPath) {
      console.log("No directory selected.");
      return;
    }

    const os = await platform();
    if (os === 'windows') {
      sendPath = formatPathForRsync(sendPath as string);
      destPath = formatPathForRsync(destPath as string);
    }

    try {
      await invoke("transfer_file", { source: sendPath as string, dest: destPath as string });
      setCount(count + 1);
    } catch (error) {
      console.error("File transfer failed:", error);
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <p>File transfers completed: {count}</p>
        <button onClick={() => transferFile()}>Transfer File</button>
      </header>
    </div>
  );
}

export default App;