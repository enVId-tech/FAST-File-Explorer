"use client";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core"; 
import { open } from "@tauri-apps/plugin-dialog";

function App() {
  const [count, setCount] = useState(0);

  async function transferFile() {
    const sendPath = await open({
      directory: true,
      multiple: false,
    });

    if (sendPath) {
      const destPath = await open({
        directory: true,
        multiple: false,
      });

      if (destPath) {
        await invoke("transfer_file", {
          source: sendPath,
          dest: destPath
        });
        setCount((count) => count + 1);
      }
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