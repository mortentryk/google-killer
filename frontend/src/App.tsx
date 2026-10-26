import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import HoleStoryPage from './pages/HoleStoryPage';
import SearchesPage from './pages/SearchesPage';
import TopicPage from './pages/TopicPage';
import { RabbitHoleProvider } from './hooks/useRabbitHole';

export default function App() {
    return (
        <BrowserRouter>
            <RabbitHoleProvider>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/searches" element={<SearchesPage />} />
                    <Route path="/holes/:id" element={<HoleStoryPage />} />
                    <Route path="/q/:slug" element={<TopicPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </RabbitHoleProvider>
        </BrowserRouter>
    );
}
