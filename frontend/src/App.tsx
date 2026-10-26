import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LatestSearchesPage from './pages/LatestSearchesPage';
import RabbitHolePage from './pages/RabbitHolePage';

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<LatestSearchesPage />} />
            <Route path="/topic" element={<RabbitHolePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
