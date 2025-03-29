import React, { useState, useCallback, useRef } from 'react';

function SpecInput({ onLoadSpec, isLoading, error }) {
  const [specInput, setSpecInput] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        setSpecInput(content); // Show content in textarea
        onLoadSpec(content);   // Trigger parsing
      };
      reader.onerror = (e) => {
        console.error("File reading error:", e);
        onLoadSpec(null, "Error reading file."); // Pass error up
      };
      reader.readAsText(file);
    }
     // Reset file input value so the same file can be loaded again
     if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }, [onLoadSpec]);

  const handlePasteChange = (event) => {
    setSpecInput(event.target.value);
  };

  const handleLoadFromPaste = () => {
    if (specInput.trim()) {
      onLoadSpec(specInput);
    }
  };

  return (
    <div className="spec-input-container card shadow-sm p-4 m-auto" style={{ maxWidth: '800px' }}>
      <div className="card-body">
        <h2 className="card-title text-center mb-4">Load OpenAPI Specification</h2>
        <p className="text-center text-muted mb-4">Upload a <code>.yaml</code> or <code>.json</code> file, or paste the content below.</p>

        {error && <div className="alert alert-danger" role="alert">{error}</div>}

        <div className="mb-3">
          <label htmlFor="specFile" className="form-label">Upload File:</label>
          <input
            ref={fileInputRef}
            type="file"
            className="form-control"
            id="specFile"
            accept=".json,.yaml,.yml"
            onChange={handleFileChange}
            disabled={isLoading}
          />
        </div>

        <div className="text-center my-3 text-muted">OR</div>

        <div className="mb-3">
          <label htmlFor="specPaste" className="form-label">Paste Content:</label>
          <textarea
            id="specPaste"
            className="form-control"
            rows="12"
            placeholder="Paste your OpenAPI JSON or YAML here..."
            value={specInput}
            onChange={handlePasteChange}
            disabled={isLoading}
            spellCheck="false"
          ></textarea>
        </div>

        <div className="d-grid"> {/* Use d-grid for full-width button */}
            <button
                className="btn btn-primary btn-lg"
                onClick={handleLoadFromPaste}
                disabled={isLoading || !specInput.trim()}
            >
                {isLoading ? (
                <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Loading...
                </>
                ) : (
                 <> <i className="fas fa-paste me-1"></i> Load from Paste </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
}

export default SpecInput;
