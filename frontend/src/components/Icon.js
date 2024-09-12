import React from 'react';

// Компонент для иконок файлов
const FileIcon = React.memo(({ file }) => {
  const getFileIcon = (file) => {
    if (file.type === 'dir') {
      return '📁'; // Иконка для папок
    } else if (file.name.match(/\.(jpg|jpeg|png|gif)$/)) {
      // Предпросмотр изображений
      return (
        <img
          src={file.path}
          alt={file.name}
          style={{ width: '50px', height: '50px', objectFit: 'cover' }}
          onError={(e) => (e.target.src = '')}
        />
      );
    } else if (file.name.match(/\.(mp4|avi|mov)$/)) {
      // Предпросмотр видео
      return '🎦';
    } else if (file.name.match(/\.(pdf|docx|doc)$/)) {
      return '📄'; // Иконка для PDF и документов
    } else if (file.name.match(/\.(zip|rar|7z)$/)) {
      return '🗜️'; // Иконка для архивов
    } else {
      return '📎'; // Иконка для остальных файлов
    }
  };

  return <span>{getFileIcon(file)}</span>;
});

export default FileIcon;
