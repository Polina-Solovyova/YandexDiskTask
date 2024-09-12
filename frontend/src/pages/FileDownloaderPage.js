import React, { useState, useEffect, ChangeEvent, MouseEvent } from 'react';
import axiosInstance from "../utils/api/axiosConfig";
import { useNavigate } from 'react-router-dom';
import '../styles/FileDownloaderPage.css';
import FileIcon from '../components/Icon.js';
import Cookies from "universal-cookie";

const cookies = new Cookies();

interface File {
  name: string;
  path: string;
}

interface Cache {
  [publicUrl: string]: File[];
}

/**
 * Страница для загрузки файлов с публичной ссылки.
 * @returns JSX.Element
 */
const FileDownloaderPage: React.FC = () => {
  const [publicUrl, setPublicUrl] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<File[]>([]);
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [cache, setCache] = useState<Cache>({});
  const [errorMessage, setErrorMessage] = useState<string>('');
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<string>('list');

  const fileCategories = {
    images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/heic'],
    videos: ['video/mp4', 'video/mpeg'],
    documents: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  };

  /**
   * Функция для получения списка файлов с публичной ссылки.
   */
  const fetchFiles = async (): Promise<void> => {
    setErrorMessage('');
    setFiles([]);

    if (!publicUrl) return;

    // Проверка кэша для уже загруженной ссылки
    if (cache[publicUrl]) {
      setFiles(cache[publicUrl]);
    } else {
      try {
        const response = await axiosInstance.get(
          `/files/?public_url=${encodeURIComponent(publicUrl)}`
        );
        if (response.data.files.length === 0) {
          setErrorMessage('Файлы по данной ссылке не найдены.');
          setFiles([]);
        } else {
          setFiles(response.data.files);
          setCache((prevCache) => ({ ...prevCache, [publicUrl]: response.data.files }));
        }
      } catch (error: any) {
        console.error('Ошибка при загрузке файлов:', error);
        setFiles([]);
        if (error.response?.status === 401 || error.response?.status === 403) {
          cookies.remove('access_token');
          cookies.remove('refresh_token');
          navigate('/login');
        } else if (error.response?.status === 404) {
          setErrorMessage('Ссылка не найдена. Пожалуйста, проверьте правильность ссылки.');
        } else {
          setErrorMessage('Произошла ошибка при загрузке файлов.');
        }
      }
    }
  };

  /**
   * Обработчик изменения URL публичной ссылки.
   * @param e - Событие изменения URL.
   */
  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setPublicUrl(e.target.value);
  };

  /**
   * Обработчик выбора/отмены выбора файла.
   * @param file - Выбранный файл.
   * @param e - Событие клика.
   */
  const handleFileSelect = (file: File, e: MouseEvent<HTMLInputElement>): void => {
    e.stopPropagation();
    if (selectedFiles.includes(file)) {
      setSelectedFiles(selectedFiles.filter((f) => f !== file));
    } else {
      setSelectedFiles([...selectedFiles, file]);
    }
  };

  /**
   * Выбор всех файлов на странице.
   */
  const selectAllFiles = (): void => {
    setSelectedFiles(filteredFiles);
  };

  /**
   * Очистка выбора файлов.
   */
  const clearSelection = (): void => {
    setSelectedFiles([]);
  };

  /**
   * Фильтрация файлов по выбранному типу.
   */
  useEffect(() => {
    const extractContentType = (file: File): string => {
      const match = file.path.match(/content_type=([^&]+)/);
      return match ? decodeURIComponent(match[1]) : '';
    };

    if (fileTypeFilter === 'all') {
      setFilteredFiles(files);
    } else if (fileTypeFilter === 'images') {
      setFilteredFiles(files.filter((file) => fileCategories.images.includes(extractContentType(file))));
    } else if (fileTypeFilter === 'videos') {
      setFilteredFiles(files.filter((file) => fileCategories.videos.includes(extractContentType(file))));
    } else if (fileTypeFilter === 'documents') {
      setFilteredFiles(files.filter((file) => fileCategories.documents.includes(extractContentType(file))));
    }
  }, [fileCategories.documents, fileCategories.images, fileCategories.videos, fileTypeFilter, files]);

  /**
   * Скачивание одного файла.
   * @param file - Файл для скачивания.
   */
  const downloadSingleFile = async (file: File): Promise<void> => {
    try {
      const response = await axiosInstance.get(
        `/download/?download_url=${encodeURIComponent(file.path)}`
      );
      const downloadUrl = response.data.redirect_url;
      const blobResponse = await fetch(downloadUrl);
      const blob = await blobResponse.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка при скачивании файла:', error);
    }
  };

  /**
   * Скачивание выбранных файлов.
   */
  const downloadFiles = async (): Promise<void> => {
    try {
      const downloadPromises = selectedFiles.map(async (file) => {
        const response = await axiosInstance.get(
          `/download/?download_url=${encodeURIComponent(file.path)}`
        );
        const downloadUrl = response.data.redirect_url;
        const blobResponse = await fetch(downloadUrl);
        const blob = await blobResponse.blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
      });

      await Promise.all(downloadPromises);
    } catch (error) {
      console.error('Ошибка при скачивании файлов:', error);
    }
  };

  return (
    <div className="FileDownloaderPage">
      <div className="input-group">
        <input
          type="text"
          value={publicUrl}
          onChange={handleUrlChange}
          placeholder="Введите публичную ссылку"
        />
        <button onClick={fetchFiles}>Получить файлы</button>
      </div>

      <div className="filter">
        <label htmlFor="fileType"></label>
        <select id="fileType" value={fileTypeFilter} onChange={(e) => setFileTypeFilter(e.target.value)}>
          <option value="all">Все файлы</option>
          <option value="images">Изображения</option>
          <option value="videos">Видео</option>
          <option value="documents">Документы</option>
        </select>
      </div>

      <div className="view-mode">
        <label htmlFor="viewMode"></label>
        <select id="viewMode" value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
          <option value="list">Список</option>
          <option value="grid">Плитка</option>
        </select>
      </div>

      {errorMessage ? (
        <div className="error-message">{errorMessage}</div>
      ) : (
        <div className={viewMode === 'grid' ? 'file-grid' : 'file-list'}>
          {filteredFiles.map((file) => (
            <div
              key={file.path}
              className="file-item"
              onClick={() => downloadSingleFile(file)}
              style={{ cursor: 'pointer', padding: '10px', border: '1px solid #ddd', margin: '5px' }}
            >
              <input
                type="checkbox"
                checked={selectedFiles.includes(file)}
                onClick={(e) => handleFileSelect(file, e)}
                style={{ marginRight: '10px' }}
              />
              <FileIcon file={file} />
              <p>{file.name}</p>
            </div>
          ))}
        </div>
      )}

      {filteredFiles.length > 0 && (
        <div className="download-contents">
          <button onClick={downloadFiles} disabled={selectedFiles.length === 0}>
            Скачать выбранные файлы
          </button>
          <button onClick={selectAllFiles}>Выбрать все</button>
          <button onClick={clearSelection}>Очистить выбор</button>
        </div>
      )}
    </div>
  );
};

export default FileDownloaderPage;
