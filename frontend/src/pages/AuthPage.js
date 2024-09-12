import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from "../utils/api/axiosConfig";
import Cookies from 'universal-cookie';
import '../styles/AuthPage.css';

const cookies = new Cookies();

/**
 * Обработчик выхода пользователя из системы.
 * Удаляет токены из cookies и отправляет запрос на сервер для выхода.
 */
export const handleLogout = async (): Promise<void> => {
  const token: string | undefined = cookies.get('access_token');

  if (!token) {
    console.error('No access token found');
    return;
  }

  try {
    await axiosInstance.post('/logout/', {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    cookies.remove('access_token');
    cookies.remove('refresh_token');
    console.log('Logout successful');
  } catch (error) {
    console.error('Logout failed', error);
  }
};

interface AuthPageProps {
  setIsAuth: (authState: boolean) => void;
  isRegistration: boolean;
}

/**
 * Компонент страницы авторизации и регистрации.
 * @param {AuthPageProps} props - Свойства компонента: `setIsAuth` и `isRegistration`.
 * @returns JSX.Element
 */
const AuthPage: React.FC<AuthPageProps> = ({ setIsAuth, isRegistration }) => {
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const axiosInterceptor = axiosInstance.interceptors.request.use(
      async (config) => {
        const accessToken = cookies.get('access_token');
        const refreshToken = cookies.get('refresh_token');

        if (accessToken && refreshToken) {
          config.headers['Authorization'] = `Bearer ${accessToken}`;

          const { exp } = parseJwt(accessToken);
          const currentTime = Math.floor(Date.now() / 1000);

          if (exp < currentTime) {
            try {
              const response = await axiosInstance.post('/refresh/', {
                refresh: refreshToken
              });

              const newAccessToken = response.data.access;
              cookies.set('access_token', newAccessToken, { path: '/' });
              config.headers['Authorization'] = `Bearer ${newAccessToken}`;
            } catch (error) {
              console.error('Token refresh failed', error);
              handleLogout();
            }
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    return () => {
      axiosInstance.interceptors.request.eject(axiosInterceptor);
    };
  }, []);

  /**
   * Функция для парсинга JWT токена.
   * @param {string} token - JWT токен.
   * @returns {any} - Распарсенные данные из токена или null.
   */
  const parseJwt = (token: string): any => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  };

  /**
   * Обработчик отправки формы.
   * Отправляет запрос на сервер для авторизации или регистрации.
   * @param {FormEvent} e - Событие отправки формы.
   */
  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const url: string = isRegistration ? '/register/' : '/login/';

    try {
      const data: { username: string; password: string; email?: string } = {
        username: username,
        password: password,
      };

      if (isRegistration) {
        data.email = email;
      }

      const response = await axiosInstance.post(url, data, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const { access_token, refresh_token } = response.data;
      if (!access_token || !refresh_token) {
        throw new Error('Tokens not received');
      }

      cookies.set('access_token', access_token, { path: '/' });
      cookies.set('refresh_token', refresh_token, { path: '/' });
      setIsAuth(true);
      navigate('/');
    } catch (error: any) {
      console.error('Authentication failed', error.response || error);
      const errorMsg: string = error.response?.data?.detail || 'Authentication failed. Please check your credentials.';
      setError(errorMsg);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>{isRegistration ? 'Register' : 'Login'}</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
            />
          </div>
          {isRegistration && (
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
              />
            </div>
          )}
          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </div>
          <button type="submit" className="auth-button">
            {isRegistration ? 'Register' : 'Login'}
          </button>
        </form>
        <div className="auth-link">
          {isRegistration ? (
            <p>Already have an account? <Link to="/login">Login</Link></p>
          ) : (
            <p>Don't have an account? <Link to="/register">Register</Link></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
