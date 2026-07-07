// Some crypto deps (bip39, crypto-js, etc.) expect Node's Buffer/process as browser
// globals. vite-plugin-node-polyfills handles the `crypto`/`stream`/etc. module imports,
// but we set the globals explicitly here so they're guaranteed present at runtime.
import { Buffer } from 'buffer';
import process from 'process';
globalThis.global = globalThis.global || globalThis;
globalThis.Buffer = globalThis.Buffer || Buffer;
globalThis.process = globalThis.process || process;

import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from "react-router-dom"
import { setZXingModuleOverrides } from 'barcode-detector/pure';

setZXingModuleOverrides({
    locateFile: (path, prefix) => {
        if (path.endsWith('.wasm')) {
            return `/wasm/${path}`;
        }
        return prefix + path;
    }
});

ReactDOM.render(
  <React.StrictMode>
          <BrowserRouter>
            <App />
          </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
