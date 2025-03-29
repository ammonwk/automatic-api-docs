import React from 'react';
import SchemaViewer from './SchemaViewer'; // Optional component for complex schemas

function ParametersTable({ parameters = [], requestBody = null, spec }) {
    const hasPathParams = parameters.some(p => p.in === 'path');
    const hasQueryParams = parameters.some(p => p.in === 'query');
    const hasHeaderParams = parameters.some(p => p.in === 'header');
    const hasCookieParams = parameters.some(p => p.in === 'cookie');

    const renderParameterRow = (param, index) => (
        <tr key={`${param.in}-${param.name}-${index}`}>
            <td>
                <span className="param-name">{param.name}</span>
                {param.required && <span className="param-required ms-1">*</span>}
            </td>
            <td>
                <SchemaViewer schema={param.schema} spec={spec} />
            </td>
             <td>
                <span className={`param-in param-in-${param.in}`}>{param.in}</span>
            </td>
            <td dangerouslySetInnerHTML={{ __html: param.description || '' }} />
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
                {requestBody.description && <p dangerouslySetInnerHTML={{ __html: requestBody.description }} />}
                {requestBody.required && <p><span className="param-required">* Required</span></p>}
            </div>
          <SchemaViewer schema={requestBody.schema} spec={spec} isRoot={true} />
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
