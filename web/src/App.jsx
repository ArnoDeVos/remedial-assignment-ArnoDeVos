/**
 * Route table.
 *
 * Every page in one place. All of them are public, because a neighbourhood
 * watch that only its members can read would defeat its own purpose.
 */

import { Route, Routes } from 'react-router-dom';

import AppLayout from './components/AppLayout.jsx';

import LoginPage from './pages/LoginPage.jsx';
import MapPage from './pages/MapPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import SubjectPage from './pages/SubjectPage.jsx';
import SubjectsPage from './pages/SubjectsPage.jsx';

/**
 * Renders the application.
 *
 * @returns {JSX.Element} The routed application.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<MapPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="subjects/:id" element={<SubjectPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="*" element={<p className="state">That page does not exist.</p>} />
      </Route>
    </Routes>
  );
}
