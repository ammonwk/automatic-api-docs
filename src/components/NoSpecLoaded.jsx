import React from 'react';

function NoSpecLoaded({ message }) {
  return (
    <div className="no-spec-loaded alert alert-info mt-4 text-center" role="alert">
      <i className="fas fa-info-circle me-2"></i>
      {message || "No specification loaded or no matching items found."}
    </div>
  );
}

export default NoSpecLoaded;
