import React from 'react';
import SchemaViewer from './SchemaViewer'; // Reuse SchemaViewer

function ResponseTable({ responses = {}, spec }) {
  const statusCodes = Object.keys(responses).sort(); // Sort status codes

  if (statusCodes.length === 0) {
    return <p className="text-muted">No responses defined for this operation.</p>;
  }

  return (
    <div className="responses-table-container">
      {statusCodes.map(code => {
        const response = responses[code];
        if (!response) return null;

        return (
          <div key={code} className="response-item mb-4">
            <h6>
              Status Code: <span className={`status-code status-code-${code.charAt(0)}xx`}>{code}</span>
              {response.description && <span className="response-description ms-2 text-muted">- {response.description}</span>}
            </h6>
            {response.schema ? (
               <>
                {response.contentType && <p className="response-content-type">Content-Type: <code>{response.contentType}</code></p>}
                <SchemaViewer schema={response.schema} spec={spec} isRoot={true}/>
               </>
            ) : (
              <p className="text-muted fst-italic">No response body schema defined.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ResponseTable;
