import { getSmartExampleValue, getSmartExampleValuePython, getContentType, getRequestBodySchema } from './helpers';

// Generate cURL example
export function generateCurlExample(endpoint, spec) {
    const serverUrl = endpoint.servers?.[0]?.url || spec?.servers?.[0]?.url || ''; // Use first server URL
    const path = endpoint.path;
    const method = endpoint.method.toUpperCase();

    // Construct URL, replacing path parameters
    let url = `${serverUrl}${path}`;
    const pathParams = endpoint.parameters?.filter(p => p.in === 'path') || [];
    pathParams.forEach(param => {
        const exampleValue = getSmartExampleValue(param.schema || { type: 'string' }, param.name);
        url = url.replace(`{${param.name}}`, encodeURIComponent(exampleValue));
    });

    // Add query parameters
    const queryParams = endpoint.parameters?.filter(p => p.in === 'query') || [];
    if (queryParams.length > 0) {
        const queryString = queryParams.map(param => {
            const exampleValue = getSmartExampleValue(param.schema || { type: 'string' }, param.name);
            return `${encodeURIComponent(param.name)}=${encodeURIComponent(exampleValue)}`;
        }).join('&');
        url += `?${queryString}`;
    }

    let curl = `# ${endpoint.summary || endpoint.operationId || 'API Request'}\n`;
    // Add authentication info if possible (basic example)
    if (endpoint.security?.length > 0 || spec?.security?.length > 0) {
         curl += `# Authentication: Requires authentication (e.g., Bearer token, API key). Replace placeholder.\n`;
    }
    curl += `\ncurl -X ${method} "${url}"`;

    // Add Headers
    const headerParams = endpoint.parameters?.filter(p => p.in === 'header') || [];
    // Determine Content-Type and Accept headers from requestBody/responses
    const contentType = getContentType(endpoint.requestBody);
    const acceptType = getContentType(endpoint.responses?.['200'] || endpoint.responses?.[Object.keys(endpoint.responses || {})[0]]); // Accept for success response

    if (contentType) {
        curl += ` \\\n  -H "Content-Type: ${contentType}"`;
    }
     if (acceptType && acceptType !== '*/*') { // Don't add default accept
        curl += ` \\\n  -H "Accept: ${acceptType}"`;
    }
    headerParams.forEach(param => {
        const exampleValue = getSmartExampleValue(param.schema || { type: 'string' }, param.name);
        curl += ` \\\n  -H "${param.name}: ${exampleValue}"`;
    });
    // Add placeholder Auth header if security is defined
    if (endpoint.security?.length > 0 || spec?.security?.length > 0) {
        curl += ` \\\n  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`; // Example placeholder
    }


    // Add Request Body
    const requestBodySchema = getRequestBodySchema(endpoint.requestBody);
    if (requestBodySchema) {
        const exampleBody = getSmartExampleValue(requestBodySchema, 'body'); // Generate example object/string
        let dataPayload = '';

        if (contentType === 'application/json') {
            dataPayload = JSON.stringify(exampleBody, null, 2); // Pretty print JSON
             curl += ` \\\n  -d '${dataPayload.replace(/'/g, "'\\''")}'`; // Escape single quotes for shell
        } else if (contentType === 'application/x-www-form-urlencoded') {
            if (typeof exampleBody === 'object') {
                dataPayload = Object.entries(exampleBody)
                                    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                                    .join('&');
                 curl += ` \\\n  -d "${dataPayload}"`;
            }
        } else if (typeof exampleBody === 'string') {
            // Handle plain text or other string types
             curl += ` \\\n  -d '${exampleBody.replace(/'/g, "'\\''")}'`;
        }
        // Add other content types (XML, etc.) as needed
    }

    return curl;
}

// Generate JavaScript (Fetch API) example
export function generateJavaScriptExample(endpoint, spec) {
    const serverUrl = endpoint.servers?.[0]?.url || spec?.servers?.[0]?.url || '';
    const path = endpoint.path;
    const method = endpoint.method.toUpperCase();

    let js = `// ${endpoint.summary || endpoint.operationId || 'API Request'}\n\n`;

    // Define path parameters
    const pathParams = endpoint.parameters?.filter(p => p.in === 'path') || [];
    pathParams.forEach(param => {
        const exampleValue = getSmartExampleValue(param.schema || { type: 'string' }, param.name);
        js += `const ${param.name} = ${JSON.stringify(exampleValue)}; // ${param.description || ''}\n`;
    });
    if (pathParams.length > 0) js += '\n';

    // Construct URL
    let urlPath = path;
    pathParams.forEach(param => {
        urlPath = urlPath.replace(`{${param.name}}`, `\${${param.name}}`);
    });
    js += `const baseUrl = '${serverUrl}';\n`;
    js += `let url = \`\${baseUrl}${urlPath}\`;\n\n`;

    // Add query parameters
    const queryParams = endpoint.parameters?.filter(p => p.in === 'query') || [];
    if (queryParams.length > 0) {
        js += `// Query Parameters\n`;
        js += `const queryParams = new URLSearchParams({\n`;
        queryParams.forEach((param, index) => {
            const exampleValue = getSmartExampleValue(param.schema || { type: 'string' }, param.name);
            js += `  ${JSON.stringify(param.name)}: ${JSON.stringify(exampleValue)}${index < queryParams.length - 1 ? ',' : ''} // ${param.description || ''}\n`;
        });
        js += `});\n`;
        js += `url += '?' + queryParams.toString();\n\n`;
    }

    // Prepare Headers
    js += `// Request Headers\n`;
    js += `const headers = new Headers();\n`;
    const headerParams = endpoint.parameters?.filter(p => p.in === 'header') || [];
    const contentType = getContentType(endpoint.requestBody);
    const acceptType = getContentType(endpoint.responses?.['200'] || endpoint.responses?.[Object.keys(endpoint.responses || {})[0]]);

    if (contentType) {
        js += `headers.append('Content-Type', '${contentType}');\n`;
    }
     if (acceptType && acceptType !== '*/*') {
        js += `headers.append('Accept', '${acceptType}');\n`;
    }
    headerParams.forEach(param => {
        const exampleValue = getSmartExampleValue(param.schema || { type: 'string' }, param.name);
        js += `headers.append(${JSON.stringify(param.name)}, ${JSON.stringify(exampleValue)}); // ${param.description || ''}\n`;
    });
     // Add placeholder Auth header if security is defined
    if (endpoint.security?.length > 0 || spec?.security?.length > 0) {
        js += `headers.append('Authorization', 'Bearer YOUR_ACCESS_TOKEN'); // Replace with your token\n`;
    }
    js += `\n`;


    // Prepare Request Body
    let bodyContent = 'null';
    const requestBodySchema = getRequestBodySchema(endpoint.requestBody);
    if (requestBodySchema) {
        const exampleBody = getSmartExampleValue(requestBodySchema, 'body');
        js += `// Request Body\n`;
        if (contentType === 'application/json') {
             js += `const bodyData = ${JSON.stringify(exampleBody, null, 2)};\n`;
             bodyContent = `JSON.stringify(bodyData)`;
        } else if (contentType === 'application/x-www-form-urlencoded') {
             js += `const bodyParams = new URLSearchParams();\n`;
             if (typeof exampleBody === 'object') {
                Object.entries(exampleBody).forEach(([key, value]) => {
                     js += `bodyParams.append(${JSON.stringify(key)}, ${JSON.stringify(value)});\n`;
                });
             }
             bodyContent = `bodyParams`;
        } else if (typeof exampleBody === 'string') {
            js += `const bodyData = ${JSON.stringify(exampleBody)};\n`;
            bodyContent = `bodyData`;
        }
        js += '\n';
    }


    // Fetch Call
    js += `// Make API request\n`;
    js += `fetch(url, {\n`;
    js += `  method: '${method}',\n`;
    js += `  headers: headers,\n`;
    if (bodyContent !== 'null') {
        js += `  body: ${bodyContent},\n`;
    }
    js += `})\n`;
    js += `  .then(response => {\n`;
    js += `    if (!response.ok) {\n`;
    js += `      // Handle HTTP errors (e.g., response.status, response.statusText)\n`;
    js += `      console.error(\`HTTP error! Status: \${response.status}\`);\n`;
    js += `      // Optionally return response.text() or response.json() for error details\n`;
    js += `      return response.text().then(text => { throw new Error(text || response.statusText) });\n`;
    js += `    }\n`;
    js += `    // Check content type before parsing\n`;
    js += `    const contentType = response.headers.get('content-type');\n`;
    js += `    if (contentType && contentType.includes('application/json')) {\n`;
    js += `      return response.json();\n`;
    js += `    } else {\n`;
    js += `      return response.text(); // Or handle other types like blob(), etc.\n`;
    js += `    }\n`;
    js += `  })\n`;
    js += `  .then(data => {\n`;
    js += `    console.log('Success:', data);\n`;
    js += `    // Process successful response data here\n`;
    js += `  })\n`;
    js += `  .catch(error => {\n`;
    js += `    console.error('Fetch Error:', error);\n`;
    js += `    // Handle network errors or errors thrown from response handling\n`;
    js += `  });`;

    return js;
}


// Generate TypeScript example
export function generateTypeScriptExample(endpoint, spec) {
    // For brevity, this often mirrors the JavaScript example but adds types.
    // Generating accurate interfaces from schemas can be complex.
    // We'll add basic types.
    const serverUrl = endpoint.servers?.[0]?.url || spec?.servers?.[0]?.url || '';
    const path = endpoint.path;
    const method = endpoint.method.toUpperCase();

    // Basic type mapping helper
    const mapType = (schema) => {
        if (!schema) return 'any';
        switch (schema.type) {
            case 'integer': return 'number';
            case 'number': return 'number';
            case 'string': return 'string';
            case 'boolean': return 'boolean';
            case 'array': return `${mapType(schema.items)}[]`;
            case 'object': return 'Record<string, any>'; // Simple object type
            default: return 'any';
        }
    };

    let ts = `// ${endpoint.summary || endpoint.operationId || 'API Request'}\n\n`;

    // Define path parameters
    const pathParams = endpoint.parameters?.filter(p => p.in === 'path') || [];
    pathParams.forEach(param => {
        const exampleValue = getSmartExampleValue(param.schema || { type: 'string' }, param.name);
        ts += `const ${param.name}: string = ${JSON.stringify(exampleValue)}; // ${param.description || ''}\n`;
    });
    if (pathParams.length > 0) ts += '\n';

    // Construct URL
    let urlPath = path;
    pathParams.forEach(param => {
        urlPath = urlPath.replace(`{${param.name}}`, `\${${param.name}}`);
    });
    ts += `const baseUrl: string = '${serverUrl}';\n`;
    ts += `let url: string = \`\${baseUrl}${urlPath}\`;\n\n`;

    // Add query parameters
    const queryParams = endpoint.parameters?.filter(p => p.in === 'query') || [];
    if (queryParams.length > 0) {
        ts += `// Query Parameters\n`;
        ts += `const queryParams: URLSearchParams = new URLSearchParams({\n`;
        queryParams.forEach((param, index) => {
            const exampleValue = getSmartExampleValue(param.schema || { type: 'string' }, param.name);
             // Ensure value is string for URLSearchParams
            ts += `  ${JSON.stringify(param.name)}: ${JSON.stringify(String(exampleValue))}${index < queryParams.length - 1 ? ',' : ''} // ${param.description || ''}\n`;
        });
        ts += `});\n`;
        ts += `url += '?' + queryParams.toString();\n\n`;
    }

    // Prepare Headers
    ts += `// Request Headers\n`;
    ts += `const headers: Headers = new Headers();\n`;
    const headerParams = endpoint.parameters?.filter(p => p.in === 'header') || [];
    const contentType = getContentType(endpoint.requestBody);
    const acceptType = getContentType(endpoint.responses?.['200'] || endpoint.responses?.[Object.keys(endpoint.responses || {})[0]]);

    if (contentType) {
        ts += `headers.append('Content-Type', '${contentType}');\n`;
    }
     if (acceptType && acceptType !== '*/*') {
        ts += `headers.append('Accept', '${acceptType}');\n`;
    }
    headerParams.forEach(param => {
        const exampleValue = getSmartExampleValue(param.schema || { type: 'string' }, param.name);
        ts += `headers.append(${JSON.stringify(param.name)}, ${JSON.stringify(String(exampleValue))}); // ${param.description || ''}\n`;
    });
     // Add placeholder Auth header if security is defined
    if (endpoint.security?.length > 0 || spec?.security?.length > 0) {
        ts += `headers.append('Authorization', 'Bearer YOUR_ACCESS_TOKEN'); // Replace with your token\n`;
    }
    ts += `\n`;

    // Prepare Request Body
    let bodyContent = 'null';
    let bodyType = 'null | BodyInit'; // General type for fetch body
    const requestBodySchema = getRequestBodySchema(endpoint.requestBody);
    if (requestBodySchema) {
        const exampleBody = getSmartExampleValue(requestBodySchema, 'body');
        const schemaType = mapType(requestBodySchema);
        ts += `// Request Body\n`;
        if (contentType === 'application/json') {
             ts += `const bodyData: ${schemaType} = ${JSON.stringify(exampleBody, null, 2)};\n`;
             bodyContent = `JSON.stringify(bodyData)`;
             bodyType = 'string';
        } else if (contentType === 'application/x-www-form-urlencoded') {
             ts += `const bodyParams: URLSearchParams = new URLSearchParams();\n`;
             bodyType = 'URLSearchParams';
             if (typeof exampleBody === 'object') {
                Object.entries(exampleBody).forEach(([key, value]) => {
                     ts += `bodyParams.append(${JSON.stringify(key)}, ${JSON.stringify(String(value))});\n`;
                });
             }
             bodyContent = `bodyParams`;
        } else if (typeof exampleBody === 'string') {
            ts += `const bodyData: string = ${JSON.stringify(exampleBody)};\n`;
            bodyContent = `bodyData`;
            bodyType = 'string';
        }
        ts += '\n';
    }

    // Define expected response type (basic)
    const successResponse = endpoint.responses?.['200'] || endpoint.responses?.[Object.keys(endpoint.responses || {}).find(c => c.startsWith('2'))];
    const successSchema = successResponse?.content?.[Object.keys(successResponse.content)[0]]?.schema;
    const responseTypeName = successSchema ? mapType(successSchema) : 'any';
    ts += `// Define expected response type (adjust as needed based on the schema)\n`;
    ts += `type SuccessResponse = ${responseTypeName};\n\n`;


    // Fetch Call
    ts += `// Make API request function\n`;
    ts += `async function makeApiRequest(): Promise<SuccessResponse> {\n`;
    ts += `  const requestOptions: RequestInit = {\n`;
    ts += `    method: '${method}',\n`;
    ts += `    headers: headers,\n`;
    if (bodyContent !== 'null') {
        ts += `    body: ${bodyContent},\n`;
    }
    ts += `  };\n\n`;
    ts += `  try {\n`;
    ts += `    const response = await fetch(url, requestOptions);\n\n`;
    ts += `    if (!response.ok) {\n`;
    ts += `      const errorText = await response.text();\n`;
    ts += `      throw new Error(\`HTTP error! Status: \${response.status} - \${errorText || response.statusText}\`);\n`;
    ts += `    }\n\n`;
    ts += `    // Assuming JSON response for success, adjust if needed\n`;
    ts += `    const data: SuccessResponse = await response.json();\n`;
    ts += `    console.log('Success:', data);\n`;
    ts += `    return data;\n`;
    ts += `  } catch (error) {\n`;
    ts += `    console.error('API Request Error:', error);\n`;
    ts += `    throw error; // Re-throw the error for the caller to handle\n`;
    ts += `  }\n`;
    ts += `}\n\n`;
    ts += `// Example usage:\n`;
    ts += `makeApiRequest()\n`;
    ts += `  .then(result => {\n`;
    ts += `    // Handle successful result\n`;
    ts += `  })\n`;
    ts += `  .catch(error => {\n`;
    ts += `    // Handle errors from the request\n`;
    ts += `  });`;


    return ts;
}


// Generate Python (requests) example
export function generatePythonExample(endpoint, spec) {
    const serverUrl = endpoint.servers?.[0]?.url || spec?.servers?.[0]?.url || '';
    const path = endpoint.path;
    const method = endpoint.method.toLowerCase(); // Use lowercase for requests method name

    let py = `# ${endpoint.summary || endpoint.operationId || 'API Request'}\n\n`;
    py += `import requests\n`;
    py += `import json\n\n`; // Import json for request body handling

    // Define path parameters
    const pathParams = endpoint.parameters?.filter(p => p.in === 'path') || [];
    let urlPath = path;
    if (pathParams.length > 0) {
        py += `# Path Parameters\n`;
        pathParams.forEach(param => {
            const exampleValue = getSmartExampleValuePython(param.schema || { type: 'string' }, param.name);
            py += `${param.name} = ${exampleValue}  # ${param.description || ''}\n`;
            urlPath = urlPath.replace(`{${param.name}}`, `{${param.name}}`); // Keep f-string format
        });
        py += '\n';
    }

    // Construct URL
    py += `base_url = '${serverUrl}'\n`;
    if (pathParams.length > 0) {
        py += `url = f"{base_url}${urlPath}"\n\n`;
    } else {
        py += `url = f"{base_url}${path}"\n\n`;
    }


    // Prepare Headers
    py += `# Request Headers\n`;
    py += `headers = {\n`;
    const headerParams = endpoint.parameters?.filter(p => p.in === 'header') || [];
    const contentType = getContentType(endpoint.requestBody);
    const acceptType = getContentType(endpoint.responses?.['200'] || endpoint.responses?.[Object.keys(endpoint.responses || {})[0]]);

    if (contentType) {
        py += `    'Content-Type': '${contentType}',\n`;
    }
     if (acceptType && acceptType !== '*/*') {
        py += `    'Accept': '${acceptType}',\n`;
    }
    headerParams.forEach(param => {
        const exampleValue = getSmartExampleValuePython(param.schema || { type: 'string' }, param.name);
        py += `    '${param.name}': ${exampleValue},  # ${param.description || ''}\n`;
    });
     // Add placeholder Auth header if security is defined
    if (endpoint.security?.length > 0 || spec?.security?.length > 0) {
        py += `    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',  # Replace with your token\n`;
    }
    py += `}\n\n`;

    // Prepare Query Parameters
    const queryParams = endpoint.parameters?.filter(p => p.in === 'query') || [];
    let queryParamsDict = 'None';
    if (queryParams.length > 0) {
        py += `# Query Parameters\n`;
        py += `query_params = {\n`;
        queryParams.forEach((param, index) => {
            const exampleValue = getSmartExampleValuePython(param.schema || { type: 'string' }, param.name);
            py += `    '${param.name}': ${exampleValue},  # ${param.description || ''}\n`;
        });
        py += `}\n\n`;
        queryParamsDict = 'query_params';
    }


    // Prepare Request Body
    let dataPayload = 'None';
    let jsonPayload = 'None';
    const requestBodySchema = getRequestBodySchema(endpoint.requestBody);
    if (requestBodySchema) {
        const exampleBody = getSmartExampleValuePython(requestBodySchema, 'body'); // Use Python helper
        py += `# Request Body\n`;
        if (contentType === 'application/json') {
             py += `# For JSON, pass the data structure to the 'json' parameter\n`;
             py += `request_body = ${exampleBody}\n\n`;
             jsonPayload = 'request_body';
        } else if (contentType === 'application/x-www-form-urlencoded') {
             py += `# For form-urlencoded, pass a dictionary to the 'data' parameter\n`;
             py += `request_data = ${exampleBody}\n\n`; // Assumes exampleBody is dict-like string
             dataPayload = 'request_data';
        } else if (typeof exampleBody === 'string') {
            // Handle plain text or other string types - use data param
            py += `# For plain text or other types, pass string to 'data'\n`;
            py += `request_data = ${exampleBody}\n\n`;
            dataPayload = 'request_data';
        }
    }

    // Make Request
    py += `# Make API request\n`;
    py += `try:\n`;
    py += `    response = requests.${method}(\n`;
    py += `        url,\n`;
    py += `        headers=headers,\n`;
    if (queryParamsDict !== 'None') {
        py += `        params=${queryParamsDict},\n`;
    }
    if (dataPayload !== 'None') {
         py += `        data=${dataPayload},\n`;
    }
     if (jsonPayload !== 'None') {
         py += `        json=${jsonPayload},\n`;
    }
    py += `    )\n\n`;
    py += `    # Raise an exception for bad status codes (4xx or 5xx)\n`;
    py += `    response.raise_for_status()\n\n`;
    py += `    # Process the successful response\n`;
    py += `    print(f"Status Code: {response.status_code}")\n`;
    py += `    try:\n`;
    py += `        # Attempt to parse JSON response\n`;
    py += `        response_data = response.json()\n`;
    py += `        print("Response JSON:", json.dumps(response_data, indent=2))\n`;
    py += `    except json.JSONDecodeError:\n`;
    py += `        # Handle non-JSON responses\n`;
    py += `        print("Response Text:", response.text)\n`;
    py += `\n`;
    py += `except requests.exceptions.HTTPError as http_err:\n`;
    py += `    print(f"HTTP error occurred: {http_err}")\n`;
    py += `    print(f"Status Code: {response.status_code}")\n`;
    py += `    print(f"Response Text: {response.text}")\n`;
    py += `except requests.exceptions.ConnectionError as conn_err:\n`;
    py += `    print(f"Connection error occurred: {conn_err}")\n`;
    py += `except requests.exceptions.Timeout as timeout_err:\n`;
    py += `    print(f"Timeout error occurred: {timeout_err}")\n`;
    py += `except requests.exceptions.RequestException as req_err:\n`;
    py += `    print(f"An unexpected error occurred: {req_err}")\n`;


    return py;
}
