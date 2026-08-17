/**
 * Route table.
 */

import { Route, Routes } from 'react-router-dom';

import AppLayout from './components/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import LoginPage from './pages/LoginPage.jsx';
import MapPage from './pages/MapPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
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
        <Route
          path="review"
          element={
            <ProtectedRoute role="moderator">
              <ReviewPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<p className="state">That page does not exist.</p>} />
      </Route>
    </Routes>
  );
}
