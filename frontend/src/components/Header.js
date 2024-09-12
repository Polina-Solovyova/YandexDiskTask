import React from 'react';
import {Link, useNavigate} from "react-router-dom";

const Header = ({ onLogout }) => {
  useNavigate();
  return (
    <header className="header">
      <div className="header-container">
        <div>
         <span>Yandex Disk File Downloader</span>
         <Link to="/logout">Logout</Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
