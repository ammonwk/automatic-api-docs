import React, { useMemo } from 'react';
import CodeBlock from './CodeBlock';
import ParametersTable from './ParametersTable';
import ResponseTable from './ResponseTable';
import { generateExampleResponse, highlightSearchTerm } from '../utils/helpers';
import {
  generateCurlExample,
  generateJavaScriptExample,
  generateTypeScriptExample,
  generatePythonExample
} from '../utils/codeExamples'; // Assuming these are adapted

function EndpointCard({ endpoint, spec, searchTerm }) { // Receive raw spec if needed for deep resolution

    const exampleRequestLanguages = useMemo(() => [
        { name: 'cURL', code: generateCurlExample(endpoint, spec) },
        { name: 'JavaScript', code: generateJavaScriptExample(endpoint, spec) },
        { name: 'TypeScript', code: generateTypeScriptExample(endpoint, spec) },
        { name: 'Python', code: generatePythonExample(endpoint, spec) }
    ], [endpoint, spec]);

    const exampleResponse = useMemo(() => generateExampleResponse(endpoint, spec), [endpoint, spec]);

    // Helper to render highlighted text or plain text
    const renderHighlighted = (text) => {
        return searchTerm ? { dangerouslySetInnerHTML: { __html: highlightSearchTerm(text, searchTerm) } } : { children: text };
    };

    return (
      <div className="endpoint-card card mb-4" id={endpoint.id} >
        <div className="endpoint-header card-header">
          <span className={`method-label method-${endpoint.method.toLowerCase()}`}>
            {endpoint.method}
          </span>
          <h4 className="endpoint-title d-inline-block mb-0 ms-2">
            {/* Highlight Path */}
            <span className="endpoint-path" {...renderHighlighted(endpoint.path)} />
            {/* Highlight Summary */}
            {endpoint.summary && <small className="endpoint-summary text-muted d-block fw-normal" {...renderHighlighted(endpoint.summary)} />}
          </h4>
        </div>

        <div className="card-body">
            {/* Highlight Description */}
            {endpoint.description && (
                <div className="endpoint-description mb-3">
                    <p {...renderHighlighted(endpoint.description)} />
                </div>
            )}

            {/* Pass searchTerm to ParametersTable */}
            {(endpoint.parameters?.length > 0 || endpoint.requestBody) && (
                <div className="parameters-section mb-4">
                    <h5 className="section-title">Parameters</h5>
                    <ParametersTable
                        parameters={endpoint.parameters || []}
                        requestBody={endpoint.requestBody}
                        spec={spec}
                        searchTerm={searchTerm} // Pass down
                    />
                </div>
            )}

            {/* Pass searchTerm to ResponseTable */}
            {endpoint.responses && Object.keys(endpoint.responses).length > 0 && (
                 <div className="response-section mb-4">
                    <h5 className="section-title">Responses</h5>
                    <ResponseTable responses={endpoint.responses} spec={spec} searchTerm={searchTerm} /> {/* Pass down */}
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

export default React.memo(EndpointCard);
