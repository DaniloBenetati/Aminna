import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { PublicCatalog } from './components/PublicCatalog';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const path = window.location.pathname;

if (path.startsWith('/catalogo')) {
  root.render(
    <React.StrictMode>
      <PublicCatalog />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
