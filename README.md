# FAST File Explorer - Tauri + Rust Backend

A modern, high-performance file explorer built with **Tauri**, **Rust**, and **React**. All backend operations run in native Rust code for superior performance, security, and cross-platform compatibility.

## Architecture

```
┌─────────────────────────────────────┐
│   React Frontend (TypeScript)       │
│  - Components, Contexts, Hooks      │
└──────────────┬──────────────────────┘
               │ Tauri Invoke
               ▼
┌─────────────────────────────────────┐
│   Tauri API Layer (TypeScript)      │
│  - Type-safe wrappers               │
└──────────────┬──────────────────────┘
               │ IPC
               ▼
┌─────────────────────────────────────┐
│   Rust Backend (src-tauri/src/)     │
│  - File operations (6 modules)      │
│  - Archive handling (ZIP)           │
│  - Search (regex, content)          │
│  - Cache (LRU)                      │
│  - Navigation (recent/quick access) │
│  - Settings management              │
└─────────────────────────────────────┘
```