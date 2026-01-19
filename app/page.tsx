"use client";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";

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

    sendPath = sendPath.replaceAll("\\", "/");
    destPath = destPath.replaceAll("\\", "/");

    console.log(`Transferring from ${sendPath} to ${destPath}`);
    
    try {
      await invoke("start_test_transfer", {
        source: sendPath as string,
        destination: destPath as string
      });
      setCount(count + 1);
    } catch (error) {
      console.error("File transfer failed:", error);
    }
  }

  useEffect(() => {
    const unlisten = listen("rsync-output", (event) => {
      console.log("Rsync Progress:", event.payload);
    });

    const unlistenErr = listen("rsync-error", (event) => {
      console.error("Rsync Error:", event.payload);
    });

    return () => {
      unlisten.then(f => f());
      unlistenErr.then(f => f());
    };
  }, []);

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