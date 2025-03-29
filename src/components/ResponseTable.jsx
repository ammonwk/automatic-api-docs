import React from 'react';
import SchemaViewer from './SchemaViewer'; // Reuse SchemaViewer
import { highlightSearchTerm } from '../utils/helpers';

function ResponseTable({ responses = {}, spec, searchTerm }) {
  const statusCodes = Object.keys(responses).sort(); // Sort status codes

  if (statusCodes.length === 0) {
    return <p className="text-muted">No responses defined for this operation.</p>;
  }

  // Helper to render highlighted text or plain text
  const renderHighlighted = (text) => {
      return searchTerm ? { dangerouslySetInnerHTML: { __html: highlightSearchTerm(text || '', searchTerm) } } : { children: text || '' };
  };

  return (
    <div className="responses-table-container">
      {statusCodes.map(code => {
        const response = responses[code];
        if (!response) return null;

        return (
          <div key={code} className="response-item mb-4">
            <h6>
              {/* Highlight Status Code */}
              Status Code: <span className={`status-code status-code-${code.charAt(0)}xx`} {...renderHighlighted(code)}></span>
              {/* Highlight Response Description */}
              {response.description && <span className="response-description ms-2 text-muted" {...renderHighlighted(`- ${response.description}`)}></span>}
            </h6>
            {response.schema ? (
               <>
                {response.contentType && <p className="response-content-type">Content-Type: <code>{response.contentType}</code></p>}
                {/* Pass searchTerm to SchemaViewer */}
                <SchemaViewer schema={response.schema} spec={spec} isRoot={true} searchTerm={searchTerm}/>
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