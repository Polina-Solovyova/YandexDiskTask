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

/**
 * Основное приложение, обеспечивающее роутинг и управление состоянием аутентификации.
 * @returns JSX.Element
 */
const App: React.FC = () => {
  const [isAuth, setIsAuth] = useState<boolean>(false); // Состояние аутентификации пользователя

  return (
    <UserProvider>
      <Router>
        <AppContent isAuth={isAuth} setIsAuth={setIsAuth} />
      </Router>
    </UserProvider>
  );
};

interface AppContentProps {
  setIsAuth: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Компонент, который управляет контентом приложения в зависимости от состояния аутентификации.
 * @param setIsAuth - Функция для обновления состояния аутентификации.
 * @returns JSX.Element
 */
const AppContent: React.FC<AppContentProps> = ({ setIsAuth }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false); // Локальное состояние аутентификации

  /**
   * Проверка на наличие токена и обновление токена при монтировании компонента.
   * Если токен недействителен, пользователь перенаправляется на страницу логина.
   */
  useEffect(() => {
    const token = cookies.get('access_token');
    if (token) {
      // Попытка обновить токен и проверить его валидность
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

  // Показывать ли хедер и футер в зависимости от текущего пути
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

/**
 * Компонент для выхода из системы. При монтировании вызывается функция logout и происходит переход на страницу логина.
 * @returns JSX.Element
 */
const Logout: React.FC = () => {
  const navigate = useNavigate();

  // Эффект для выполнения выхода при монтировании компонента
  useEffect(() => {
    const performLogout = async () => {
      await handleLogout(); // Функция для выхода пользователя
      navigate('/login'); // Перенаправление на страницу логина после выхода
    };

    performLogout();
  }, [navigate]);

  return <p>Logging out...</p>; // Информативное сообщение при выходе
};

export default App;
