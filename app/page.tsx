"use client";
import { FileExplorer } from "./components/FileExplorer";

function App() {
  return (
    <div className="App" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <FileExplorer />
    </div>
  );
}

export default App;