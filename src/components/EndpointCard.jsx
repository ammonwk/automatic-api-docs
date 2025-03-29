import React, { useMemo } from 'react';
import CodeBlock from './CodeBlock';
import ParametersTable from './ParametersTable';
import ResponseTable from './ResponseTable';
import { generateExampleResponse } from '../utils/helpers';
import {
  generateCurlExample,
  generateJavaScriptExample,
  generateTypeScriptExample,
  generatePythonExample
} from '../utils/codeExamples'; // Assuming these are adapted

function EndpointCard({ endpoint, spec }) { // Receive raw spec if needed for deep resolution

    const exampleRequestLanguages = useMemo(() => [
        { name: 'cURL', code: generateCurlExample(endpoint, spec) },
        { name: 'JavaScript', code: generateJavaScriptExample(endpoint, spec) },
        { name: 'TypeScript', code: generateTypeScriptExample(endpoint, spec) },
        { name: 'Python', code: generatePythonExample(endpoint, spec) }
    ], [endpoint, spec]);

    const exampleResponse = useMemo(() => generateExampleResponse(endpoint, spec), [endpoint, spec]);

    return (
      // Add scroll-margin-top here or in CSS
      <div className="endpoint-card card mb-4" id={endpoint.id} >
        <div className="endpoint-header card-header">
          <span className={`method-label method-${endpoint.method.toLowerCase()}`}>
            {endpoint.method}
          </span>
          <h4 className="endpoint-title d-inline-block mb-0 ms-2">
            <span className="endpoint-path">{endpoint.path}</span>
            {endpoint.summary && <small className="endpoint-summary text-muted d-block fw-normal">{endpoint.summary}</small>}
          </h4>
        </div>

        <div className="card-body">
            {endpoint.description && (
                <div className="endpoint-description mb-3">
                    <p dangerouslySetInnerHTML={{ __html: endpoint.description }} /> {/* Allow basic markdown if needed */}
                </div>
            )}

            {(endpoint.parameters?.length > 0 || endpoint.requestBody) && (
                <div className="parameters-section mb-4">
                    <h5 className="section-title">Parameters</h5>
                    <ParametersTable
                        parameters={endpoint.parameters || []}
                        requestBody={endpoint.requestBody}
                        spec={spec} // Pass spec for resolving schemas if needed
                    />
                </div>
            )}

            {endpoint.responses && Object.keys(endpoint.responses).length > 0 && (
                 <div className="response-section mb-4">
                    <h5 className="section-title">Responses</h5>
                    <ResponseTable responses={endpoint.responses} spec={spec} />
                 </div>
            )}

            <div className="example-request-section mb-4">
                <h5 className="section-title">Example Request</h5>
                <CodeBlock languages={exampleRequestLanguages} defaultLanguage="curl" />
            </div>

            <div className="example-response-section">
                <h5 className="section-title">Example Response (Success)</h5>
                 <CodeBlock
                    languages={[{ name: 'JSON', code: exampleResponse }]}
                    isResponse={true}
                    defaultLanguage="json"
                 />
            </div>
        </div>
      </div>
    );
  }

export default React.memo(EndpointCard); // Memoize based on props
