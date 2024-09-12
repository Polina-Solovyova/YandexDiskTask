import React, { useEffect, useState } from 'react';
import FileDownloaderPage from './pages/FileDownloaderPage';
import Header from './components/Header';
import Footer from './components/Footer';
import { UserProvider } from './providers/UserProvider';
import './styles/App.css';
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import AuthPage, { handleLogout } from "./pages/AuthPage";
import Cookies from "universal-cookie";
import axiosInstance from "./utils/api/axiosConfig";

const cookies = new Cookies();

const App = () => {
  const [isAuth, setIsAuth] = useState(false);

  return (
    <UserProvider>
      <Router>
        <AppContent isAuth={isAuth} setIsAuth={setIsAuth} />
      </Router>
    </UserProvider>
  );
};

const AppContent = ({ setIsAuth }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = cookies.get('access_token');
    if (token) {
      // Trying to update the token and check its validity
      axiosInstance.post('/refresh/', { refresh: cookies.get('refresh_token') })
        .then(response => {
          setIsAuthenticated(true);
          navigate('/');
        })
        .catch(() => {
          setIsAuthenticated(false);
          navigate('/login');
        });
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const showHeaderFooter = location.pathname === '/';

  return (
    <>
      {showHeaderFooter && <Header />}
      <Routes>
        <Route path="/login" element={<AuthPage setIsAuth={setIsAuth} isRegistration={false} />} />
        <Route path="/register" element={<AuthPage setIsAuth={setIsAuth} isRegistration={true} />} />
        {isAuthenticated ? (
          <Route path="/" element={<FileDownloaderPage />} />
        ) : (
          <Route path="/" element={<AuthPage setIsAuth={setIsAuth} isRegistration={false} />} />
        )}
        <Route path="/logout" element={<Logout />} />
      </Routes>
      {showHeaderFooter && <Footer />}
    </>
  );
};

const Logout = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    const performLogout = async () => {
      await handleLogout();
      navigate('/login');
    };

    performLogout();
  }, [navigate]);

  return <p>Logging out...</p>;
};

export default App;
