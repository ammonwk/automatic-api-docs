import React from 'react';
import { useOpenApi } from '../contexts/OpenApiContext'; // Import context hook

function Navbar({
  title,
  version,
  onToggleSidebar,
  onToggleDarkMode,
  darkMode,
  onSearch,
  onClearSpec,
  hasSpec
}) {
  const { isLoading } = useOpenApi(); // Get loading state from context

  const handleSearchChange = (e) => {
    onSearch(e.target.value);
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark fixed-top">
      <div className="container-fluid">
        <button
          className={`btn btn-outline-light me-2 d-lg-none ${!hasSpec ? 'disabled' : ''}`} // Disable if no spec
          onClick={onToggleSidebar}
          aria-label="Toggle Sidebar"
          disabled={!hasSpec} // Disable button if no spec
        >
          <i className="fas fa-bars"></i>
        </button>

        <a className="navbar-brand" href="#">
          <i className="fas fa-book-open me-2"></i>
          {title || 'OpenAPI Viewer'} {version && <small className="api-version">v{version}</small>}
        </a>

        {/* Toggler for mobile */}
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavContent" aria-controls="navbarNavContent" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNavContent">
          {/* Spacer */}
          <div className="navbar-nav me-auto"></div>

          {/* Right-aligned items */}
          <div className="d-flex align-items-center mt-2 mt-lg-0">
            {hasSpec && (
              <input
                id="global-search"
                className="form-control form-control-sm mx-2 search-input"
                type="search"
                placeholder="Search..."
                aria-label="Search"
                onChange={handleSearchChange}
                disabled={isLoading} // Disable search while parsing
              />
            )}

            <button
              className="btn btn-sm dark-mode-toggle mx-1"
              onClick={onToggleDarkMode}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>

            {hasSpec && (
              <button
                className="btn btn-sm btn-outline-warning ms-2"
                onClick={onClearSpec}
                title="Load New Specification"
                disabled={isLoading} // Disable clear while parsing
              >
                 <i className="fas fa-file-import me-1 px-4"></i> Load New
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
