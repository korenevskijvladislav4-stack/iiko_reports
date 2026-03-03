import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import SalesReportPage from './pages/SalesReportPage';
import DishesReportPage from './pages/DishesReportPage';
import CashiersReportPage from './pages/CashiersReportPage';
import StoreBalancePage from './pages/StoreBalancePage';
import ReferencesPage from './pages/ReferencesPage';
import DepartmentsPage from './pages/DepartmentsPage';
import EmployeesPage from './pages/EmployeesPage';
import SchedulePage from './pages/SchedulePage';
import ProductCostPage from './pages/ProductCostPage';

/** Редирект сотрудников (staff) на страницу сотрудников. Менеджеры (scheduleAccessRole manager) дополнительно имеют доступ к подразделениям. */
function StaffRedirect({ children, allowForManager = false }: { children: React.ReactNode; allowForManager?: boolean }) {
  const { auth } = useAuth();
  const isStaff = auth?.user?.role === 'staff';
  const isManager = isStaff && auth?.user?.scheduleAccessRole === 'manager';
  if (isStaff && !(allowForManager && isManager)) {
    return <Navigate to="/hr/employees" replace />;
  }
  return <>{children}</>;
}

/** Доступ только для владельца (owner). Админы и сотрудники перенаправляются на главную. */
function OwnerOnly({ children }: { children: React.ReactNode }) {
  const { auth } = useAuth();
  if (auth?.user?.role !== 'owner') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<StaffRedirect><HomePage /></StaffRedirect>} />
            <Route path="reports/sales" element={<StaffRedirect><SalesReportPage /></StaffRedirect>} />
            <Route path="reports/dishes" element={<StaffRedirect><DishesReportPage /></StaffRedirect>} />
            <Route path="reports/cashiers" element={<StaffRedirect><CashiersReportPage /></StaffRedirect>} />
            <Route path="reports/product-cost" element={<StaffRedirect><ProductCostPage /></StaffRedirect>} />
          <Route path="reports/store-balance" element={<StaffRedirect><StoreBalancePage /></StaffRedirect>} />
            <Route path="references" element={<OwnerOnly><ReferencesPage /></OwnerOnly>} />
            <Route path="hr/departments" element={<StaffRedirect allowForManager><DepartmentsPage /></StaffRedirect>} />
            <Route path="hr/employees" element={<EmployeesPage />} />
            <Route path="hr/schedule" element={<SchedulePage />} />
            <Route path="hr" element={<Navigate to="hr/employees" replace />} />
          </Route>
          <Route path="*" element={<StaffRedirect><Navigate to="/" replace /></StaffRedirect>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
