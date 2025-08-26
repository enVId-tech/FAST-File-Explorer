# Fast Access and Simple Transfer File Explorer

Fast Access and Simple Transfer File Explorer (FAST File Explorer) is a lightweight, user-friendly file explorer designed for quick navigation and efficient file management. It provides an intuitive interface for browsing, accessing, and transferring files, making it easy to organize and move your data with minimal effort. Ideal for users who need a fast and simple solution for everyday file operations.

## How Fast File Explorer Compares to Windows File Explorer

| Feature/Advantage                                                                 | Fast File Explorer         | Windows File Explorer      |
|-----------------------------------------------------------------------------------|---------------------------|---------------------------|
| Optimized file transfer protocols                                                 | Yes                       | No                        |
| Accurate file completion time estimates                                      | Yes (partially)                      | No (not for mixed sizes of files)                       |
| Cross-platform support (Windows, MacOS, Linux)                                    | Yes                       | No (Windows only)         |
| Faster, more sophisticated file search and indexing                               | Yes                       | No               
| Performance-optimized features (zip, thumbnails, etc.)                            | Yes                       | Limited                   |
| Classic Windows 10 and Windows 11 UI options                                      | Yes                       | No                        |
| Planned full feature parity with Windows File Explorer                            | Yes (planned)             | N/A                       |
| Local caching of transfer times for accurate speed estimates                      | Yes                       | No                        |
| Easier pinning and access to frequently visited files                             | Yes                       | No (clunky system)        |

## Supported Protocols Comparison

| Protocol   | Fast File Explorer | Windows File Explorer | Mac Finder |
|------------|-------------------|----------------------|------------|
| WebDAV     | Yes               | No                   | Yes        |
| FTP        | Yes               | No                   | Yes        |
| SFTP       | Yes               | No                   | No         |
| SMB        | Yes               | Yes                  | Yes        |
| Rsync      | Yes               | No                   | No         |
| Robocopy   | Yes               | Yes (CLI only)       | No         |

## Getting Started

To get started with Fast File Explorer:

1. Clone the repository:
   ```sh
   git clone https://github.com/enVId-tech/Fast-File-Explorer.git
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the application:
   ```sh
   npm run dev
   ```

## Tech Used

- Electron
- React (with TypeScript)
- Vite
- SCSS
- Node.js


## Acknowledgements

- Inspired by the need for a faster, more flexible file explorer.
- Thanks to the open-source community for libraries and tools that made this project possible.
- This project relies on several key open-source libraries:
  - **Electron**: For building the cross-platform desktop application.
  - **React** and **React DOM**: For building the user interface.
  - **Vite**: For fast development and build tooling.
  - **Sass**: For styling with SCSS.
  - **TypeScript**: For type-safe JavaScript development.
  - **@electron-forge** plugins: For packaging, building, and managing the Electron app lifecycle.


## Licensing
This project is licensed under the GNU Public License - see the [LICENSE](./LICENSE) file for details.

Legalese down there

Copyright (C) 2025 Erick Tran

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.