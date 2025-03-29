import React from 'react';
import SchemaViewer from './SchemaViewer'; // Optional component for complex schemas
import { highlightSearchTerm } from '../utils/helpers';

function ParametersTable({ parameters = [], requestBody = null, spec, searchTerm }) {
    const hasPathParams = parameters.some(p => p.in === 'path');
    const hasQueryParams = parameters.some(p => p.in === 'query');
    const hasHeaderParams = parameters.some(p => p.in === 'header');
    const hasCookieParams = parameters.some(p => p.in === 'cookie');

    // Helper to render highlighted text or plain text
    const renderHighlighted = (text) => {
        return searchTerm ? { dangerouslySetInnerHTML: { __html: highlightSearchTerm(text || '', searchTerm) } } : { children: text || '' };
    };

    const renderParameterRow = (param, index) => (
      <tr key={`${param.in}-${param.name}-${index}`}>
          <td>
              {/* Highlight Name */}
              <span className="param-name" {...renderHighlighted(param.name)} />
              {param.required && <span className="param-required ms-1">*</span>}
          </td>
          <td>
              {/* Pass searchTerm to SchemaViewer */}
              <SchemaViewer schema={param.schema} spec={spec} searchTerm={searchTerm} />
          </td>
           <td>
              <span className={`param-in param-in-${param.in}`}>{param.in}</span>
          </td>
          {/* Highlight Description */}
          <td {...renderHighlighted(param.description)} />
      </tr>
  );

  return (
    <div className="parameters-table-container">
      {hasPathParams && (
        <>
          <h6>Path Parameters</h6>
          <div className="table-responsive">
            <table className="table table-sm table-bordered table-hover">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Schema</th>
                  <th>In</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {parameters.filter(p => p.in === 'path').map(renderParameterRow)}
              </tbody>
            </table>
          </div>
        </>
      )}

      {hasQueryParams && (
        <>
          <h6 className="mt-3">Query Parameters</h6>
          <div className="table-responsive">
            <table className="table table-sm table-bordered table-hover">
              <thead>
                 <tr>
                    <th>Name</th>
                    <th>Schema</th>
                    <th>In</th>
                    <th>Description</th>
                 </tr>
              </thead>
              <tbody>
                {parameters.filter(p => p.in === 'query').map(renderParameterRow)}
              </tbody>
            </table>
          </div>
        </>
      )}

      {requestBody && (
        <>
          <h6 className="mt-3">Request Body</h6>
           <div className="request-body-details mb-2">
                {/* Highlight Request Body Description */}
                {requestBody.description && <p {...renderHighlighted(requestBody.description)} />}
                {requestBody.required && <p><span className="param-required">* Required</span></p>}
            </div>
           {/* Pass searchTerm to SchemaViewer for request body */}
          <SchemaViewer schema={requestBody.schema} spec={spec} isRoot={true} searchTerm={searchTerm} />
        </>
      )}

      {hasHeaderParams && (
        <>
          <h6 className="mt-3">Header Parameters</h6>
          <div className="table-responsive">
            <table className="table table-sm table-bordered table-hover">
               <thead>
                 <tr>
                    <th>Name</th>
                    <th>Schema</th>
                    <th>In</th>
                    <th>Description</th>
                 </tr>
               </thead>
              <tbody>
                {parameters.filter(p => p.in === 'header').map(renderParameterRow)}
              </tbody>
            </table>
          </div>
        </>
      )}

       {hasCookieParams && (
        <>
          <h6 className="mt-3">Cookie Parameters</h6>
          <div className="table-responsive">
            <table className="table table-sm table-bordered table-hover">
               <thead>
                 <tr>
                    <th>Name</th>
                    <th>Schema</th>
                    <th>In</th>
                    <th>Description</th>
                 </tr>
               </thead>
              <tbody>
                {parameters.filter(p => p.in === 'cookie').map(renderParameterRow)}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!hasPathParams && !hasQueryParams && !hasHeaderParams && !hasCookieParams && !requestBody && (
        <p className="text-muted">No parameters defined for this operation.</p>
      )}
    </div>
  );
}

export default ParametersTable;
