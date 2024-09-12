import React, { useState, useEffect } from 'react';
import axiosInstance from "../utils/api/axiosConfig";
import { useNavigate } from 'react-router-dom';
import '../styles/FileDownloaderPage.css';
import FileIcon from '../components/Icon.js';
import Cookies from "universal-cookie";

const cookies = new Cookies();

const FileDownloaderPage = () => {
  const [publicUrl, setPublicUrl] = useState('');
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [cache, setCache] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('list');

  const fileCategories = {
    images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/heic'],
    videos: ['video/mp4', 'video/mpeg'],
    documents: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  };

  const fetchFiles = async () => {
    setErrorMessage('');
    setFiles([]);

    if (!publicUrl) return;

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
      } catch (error) {
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

  const handleUrlChange = (e) => {
    setPublicUrl(e.target.value);
  };

  const handleFileSelect = (file, e) => {
    e.stopPropagation();
    if (selectedFiles.includes(file)) {
      setSelectedFiles(selectedFiles.filter((f) => f !== file));
    } else {
      setSelectedFiles([...selectedFiles, file]);
    }
  };

  const selectAllFiles = () => {
    setSelectedFiles(filteredFiles);
  };

  const clearSelection = () => {
    setSelectedFiles([]);
  };

  useEffect(() => {
    const extractContentType = (file) => {
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

  const downloadSingleFile = async (file) => {
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

  const downloadFiles = async () => {
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
