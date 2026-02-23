import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import SalesReportPage from './pages/SalesReportPage';
import DishesReportPage from './pages/DishesReportPage';
import CashiersReportPage from './pages/CashiersReportPage';
import ReferencesPage from './pages/ReferencesPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="reports/sales" element={<SalesReportPage />} />
            <Route path="reports/dishes" element={<DishesReportPage />} />
            <Route path="reports/cashiers" element={<CashiersReportPage />} />
            <Route path="references" element={<ReferencesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
