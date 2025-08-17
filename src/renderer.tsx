import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import Main from './app/Main.tsx';

const root: Root = createRoot(document.body);
root.render(<Main />);