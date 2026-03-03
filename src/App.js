import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

import AppLanding from './pages/AppLanding';
import CreatePage from './pages/CreatePage';
import UnlockPage from './pages/UnlockPage';
import 'bootstrap/dist/css/bootstrap.min.css';
import './style/layout.css';

function App() {
    const location = useLocation();

    useEffect(() => {
        let pageTitle = 'Cold Storage Vault for Digital Assets and Passwords';
        const path = location.pathname.split('/')[1];
        if (path) {
            pageTitle = path.charAt(0).toUpperCase() + path.slice(1);
        }
        document.title = 'PaperVault.xyz - ' + pageTitle;
    }, [location]);

    return (
        <Routes>
            <Route path="/" element={<AppLanding />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/unlock" element={<UnlockPage />} />
        </Routes>
    );
}

export default App;
