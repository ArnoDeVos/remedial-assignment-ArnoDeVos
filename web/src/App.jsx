/**
 * Route table.
 */

import { Route, Routes } from 'react-router-dom';

import AppLayout from './components/AppLayout.jsx';

import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import SubjectsPage from './pages/SubjectsPage.jsx';

/**
 * Renders the application's public route table.
 *
 * @returns {JSX.Element} The routed application.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<SubjectsPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="*" element={<p className="state">That page does not exist.</p>} />
      </Route>
    </Routes>
  );
}
