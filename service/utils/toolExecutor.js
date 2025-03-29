// service/utils/toolExecutor.js
const fs = require('fs').promises;
const path = require('path');

// Load API data from JSON file
const loadApiData = async () => {
  const apiDataPath = path.join(__dirname, '../data/apiData.json');
  const data = await fs.readFile(apiDataPath, 'utf8');
  return JSON.parse(data);
};

// Execute the appropriate tool based on the name
exports.runTool = async (toolName, input) => {
    switch (toolName) {
      case 'search_documentation':
        return await searchDocumentation(input.query, input.language || 'javascript');
      default:
        return `Error: Tool '${toolName}' not found`;
    }
  };

  async function searchDocumentation(query, language) {
    try {
      const apiData = await loadApiData();
      const lowerQuery = query.toLowerCase();
      const results = [];
      
      // Search through all paths and methods
      Object.entries(apiData.paths || {}).forEach(([path, methods]) => {
        Object.entries(methods).forEach(([method, details]) => {
          const matchScore = calculateMatchScore(path, details, lowerQuery);
          
          if (matchScore > 0) {
            results.push({
              path: path,
              method: method.toUpperCase(),
              description: details.description || details.summary || '',
              parameters: details.parameters || [],
              matchScore
            });
          }
        });
      });
      
      // Sort by match score and limit results
      results.sort((a, b) => b.matchScore - a.matchScore);
      const topResults = results.slice(0, 5); // Showing top 5 results
      
      if (topResults.length === 0) {
        return "No endpoints found matching your query. Try different keywords or a more general search term.";
      }
      
      // Build comprehensive response
      let response = `# Search Results for "${query}"\n\n`;
      
      // Add endpoint information and details for each result
      for (const endpoint of topResults) {
        response += `## ${endpoint.method} ${endpoint.path}\n\n`;
        response += `${endpoint.description}\n\n`;
        
        // Add parameters section
        if (endpoint.parameters && endpoint.parameters.length > 0) {
          response += `### Parameters:\n\n`;
          
          for (const param of endpoint.parameters) {
            if (param.name) {
              const paramType = param.type || (param.schema ? param.schema.type : 'object');
              const required = param.required ? ' [Required]' : '';
              const description = param.description || 'No description available';
              response += `- **${param.name}** (${paramType})${required}: ${description}\n`;
            }
          }
          response += `\n`;
        }
        
        // Add code example
        response += `### Example Code (${language}):\n\n`;
        
        let code = '';
        switch (language) {
          case 'javascript':
            code = generateJavaScriptExample(endpoint);
            break;
          case 'javascript_apimodule':
            code = generateApiModuleExample(endpoint);
            break;
          case 'python':
            code = generatePythonExample(endpoint);
            break;
          case 'curl':
            code = generateCurlExample(endpoint);
            break;
          default:
            code = generateJavaScriptExample(endpoint);
        }
        
        response += `\`\`\`${language === 'javascript_apimodule' ? 'javascript' : language}\n${code}\n\`\`\`\n\n`;
        
        // Add separator between endpoints
        response += `---\n\n`;
      }
      
      // Add usage tips
      response += `## Tips for Using These Endpoints\n\n`;
      response += `- Always include your authentication credentials (API key and token)\n`;
      response += `- Search endpoints have a limit of 50,000 IDs per response\n`;
      response += `- Get endpoints have a limit of 1,000 entities per request\n`;
      response += `- The API has a rate limit of 3,000 requests per minute\n`;
      // TODO: These tips won't apply to all API specs
      
      return response;
    } catch (error) {
      console.error('Search documentation error:', error);
      return `Error searching for '${query}': ${error.message}. Please try a different search term.`;
    }
  }
  
// Helper functions

// Calculate match score for search results
function calculateMatchScore(path, details, query) {
    // Split the query into individual terms
    const terms = query.split(/[\s\/]+/).filter(term => term.length > 0);
    let totalScore = 0;
    let matchedTerms = 0;
    
    // For each term, check for matches
    for (const term of terms) {
      if (term.length < 2) continue; // Skip very short terms
      
      let termMatched = false;
      
      // Check path
      if (path.toLowerCase().includes(term)) {
        totalScore += 10;
        termMatched = true;
      }
      
      // Check description
      const description = details.description || details.summary || '';
      if (description.toLowerCase().includes(term)) {
        totalScore += 5;
        termMatched = true;
      }
      
      // Check parameters
      const parameters = details.parameters || [];
      for (const param of parameters) {
        if (param.name && typeof param.name === 'string' && param.name.toLowerCase().includes(term)) {
          totalScore += 3;
          termMatched = true;
        }
        if (param.description && param.description.toLowerCase().includes(term)) {
          totalScore += 2;
          termMatched = true;
        }
      }
      
      if (termMatched) {
        matchedTerms++;
      }
    }
    
    // Give bonus points for matching multiple terms
    if (terms.length > 1 && matchedTerms > 1) {
      totalScore += matchedTerms * 5; // Bonus for matching multiple terms
    }
    
    return totalScore;
  }
  


// Generate examples in different languages
function generateJavaScriptExample(endpoint) {
  const isSearch = endpoint.path.includes('/search');
  const isGet = endpoint.path.includes('/get');
  const entityType = endpoint.path.split('/')[1]; // Extract entity type from path
  
  let code = `// Example ${endpoint.method} request to ${endpoint.path}\n`;
  code += `const apiKey = 'YOUR_API_KEY';\n`;
  code += `const apiToken = 'YOUR_API_TOKEN';\n`;
  code += `const baseUrl = 'https://api.example.com';\n\n`;
  
  // Generate params based on endpoint type
  if (isSearch) {
    code += `// Create search parameters\n`;
    code += `const params = {\n`;
    code += `  authenticationKey: apiKey,\n`;
    code += `  authenticationToken: apiToken,\n`;
    
    // Add example params for search
    code += `  // Add your search filters here\n`;
    code += `  includeData: 1 // Set to 1 to include full entity data in response\n`;
    code += `};\n\n`;
  } else if (isGet) {
    code += `// Create get parameters\n`;
    code += `const params = {\n`;
    code += `  authenticationKey: apiKey,\n`;
    code += `  authenticationToken: apiToken,\n`;
    code += `  ${entityType}IDs: [12345, 67890] // Replace with actual IDs\n`;
    code += `};\n\n`;
  } else {
    // Other endpoints
    code += `// Create request parameters\n`;
    code += `const params = {\n`;
    code += `  authenticationKey: apiKey,\n`;
    code += `  authenticationToken: apiToken,\n`;
    
    // Add example params based on endpoint parameters
    endpoint.parameters.forEach(param => {
      if (param.name !== 'authenticationKey' && param.name !== 'authenticationToken') {
        const exampleValue = getExampleValue(param);
        code += `  ${param.name}: ${exampleValue},\n`;
      }
    });
    
    code += `};\n\n`;
  }
  
  code += `// Convert params to form data\n`;
  code += `const formData = new URLSearchParams();\n`;
  code += `Object.entries(params).forEach(([key, value]) => {\n`;
  code += `  if (Array.isArray(value)) {\n`;
  code += `    value.forEach(item => formData.append(key, item));\n`;
  code += `  } else {\n`;
  code += `    formData.append(key, value);\n`;
  code += `  }\n`;
  code += `});\n\n`;
  
  code += `// Make API request\n`;
  code += `fetch(\`\${baseUrl}${endpoint.path}\`, {\n`;
  code += `  method: 'POST',\n`;
  code += `  headers: {\n`;
  code += `    'Content-Type': 'application/x-www-form-urlencoded'\n`;
  code += `  },\n`;
  code += `  body: formData\n`;
  code += `})\n`;
  code += `.then(response => {\n`;
  code += `  if (!response.ok) {\n`;
  code += `    throw new Error(\`HTTP error! Status: \${response.status}\`);\n`;
  code += `  }\n`;
  code += `  return response.json();\n`;
  code += `})\n`;
  code += `.then(data => {\n`;
  code += `  console.log('Success:', data);\n`;
  
  if (isSearch) {
    code += `  // Handle search results\n`;
    code += `  if (data.${entityType}s) {\n`;
    code += `    console.log(\`Found \${data.${entityType}s.length} results\`);\n`;
    code += `  }\n`;
  } else if (isGet) {
    code += `  // Handle retrieved entities\n`;
    code += `  if (data.${entityType}s) {\n`;
    code += `    console.log(\`Retrieved \${data.${entityType}s.length} ${entityType}s\`);\n`;
    code += `  }\n`;
  }
  
  code += `})\n`;
  code += `.catch(error => {\n`;
  code += `  console.error('Error:', error);\n`;
  code += `});`;
  
  return code;
}

function generateApiModuleExample(endpoint) {
  const isSearch = endpoint.path.includes('/search');
  const isGet = endpoint.path.includes('/get');
  const entityType = endpoint.path.split('/')[1]; // Extract entity type from path
  
  let code = `// Example using apiModule for ${endpoint.path}\n`;
  code += `// Assuming apiModule is already initialized with your credentials\n\n`;
  
  if (isSearch) {
    code += `// Search for ${entityType}s\n`;
    code += `apiModule.search('${entityType}', {\n`;
    code += `  // Add your search filters here\n`;
    
    // Add example filters for common entity types
    if (entityType === 'customer') {
      code += `  'balanceAge': {\n`;
      code += `    'operator': '>',\n`;
      code += `    'value': '30'\n`;
      code += `  },\n`;
    } else if (entityType === 'appointment') {
      code += `  'appointmentDate': {\n`;
      code += `    'operator': '>',\n`;
      code += `    'value': '2025-03-01'\n`;
      code += `  },\n`;
    }
    
    code += `  'includeData': 1 // Include full entity data in response\n`;
    code += `}, true) // Set to true to automatically handle pagination\n`;
    code += `.then(function(${entityType}s) {\n`;
    code += `  console.log(\`Found \${${entityType}s.length} ${entityType}s\`);\n`;
    code += `  // Process data or export to CSV\n`;
    code += `  apiModule.download(${entityType}s);\n`;
    code += `})\n`;
    code += `.catch(function(error) {\n`;
    code += `  console.error('Error:', error);\n`;
    code += `});`;
  } else if (isGet) {
    code += `// First search for IDs, then get full entities\n`;
    code += `apiModule.search('${entityType}', {\n`;
    code += `  // Add your search filters here\n`;
    code += `  'includeData': 0 // Just get IDs first\n`;
    code += `})\n`;
    code += `.then(function(${entityType}IDs) {\n`;
    code += `  // Then get full entities with all details\n`;
    code += `  return apiModule.get('${entityType}', ${entityType}IDs);\n`;
    code += `})\n`;
    code += `.then(function(${entityType}s) {\n`;
    code += `  console.log(\`Retrieved \${${entityType}s.length} ${entityType}s\`);\n`;
    code += `  // Process the entities\n`;
    code += `})\n`;
    code += `.catch(function(error) {\n`;
    code += `  console.error('Error:', error);\n`;
    code += `});`;
  } else {
    // For other endpoints, use the call method
    const action = endpoint.path.split('/')[2] || 'action';
    
    code += `// Call custom endpoint\n`;
    code += `apiModule.call('${entityType}', '${action}', {\n`;
    
    // Add example params based on endpoint parameters
    endpoint.parameters.forEach(param => {
      if (param.name !== 'authenticationKey' && param.name !== 'authenticationToken') {
        const exampleValue = getExampleValue(param);
        code += `  ${param.name}: ${exampleValue},\n`;
      }
    });
    
    code += `})\n`;
    code += `.then(function(response) {\n`;
    code += `  console.log('Success:', response);\n`;
    code += `  // Process the response\n`;
    code += `})\n`;
    code += `.catch(function(error) {\n`;
    code += `  console.error('Error:', error);\n`;
    code += `});`;
  }
  
  return code;
}

function generatePythonExample(endpoint) {
  const isSearch = endpoint.path.includes('/search');
  const isGet = endpoint.path.includes('/get');
  const entityType = endpoint.path.split('/')[1]; // Extract entity type from path
  
  let code = `# Example ${endpoint.method} request to ${endpoint.path}\n`;
  code += `import requests\n\n`;
  code += `# API credentials\n`;
  code += `api_key = 'YOUR_API_KEY'\n`;
  code += `api_token = 'YOUR_API_TOKEN'\n`;
  code += `base_url = 'https://api.example.com'\n\n`;
  
  // Generate params based on endpoint type
  if (isSearch) {
    code += `# Create search parameters\n`;
    code += `params = {\n`;
    code += `    'authenticationKey': api_key,\n`;
    code += `    'authenticationToken': api_token,\n`;
    
    // Add example params for search
    code += `    # Add your search filters here\n`;
    code += `    'includeData': 1  # Set to 1 to include full entity data in response\n`;
    code += `}\n\n`;
  } else if (isGet) {
    code += `# Create get parameters\n`;
    code += `params = {\n`;
    code += `    'authenticationKey': api_key,\n`;
    code += `    'authenticationToken': api_token,\n`;
    code += `    '${entityType}IDs': [12345, 67890]  # Replace with actual IDs\n`;
    code += `}\n\n`;
  } else {
    // Other endpoints
    code += `# Create request parameters\n`;
    code += `params = {\n`;
    code += `    'authenticationKey': api_key,\n`;
    code += `    'authenticationToken': api_token,\n`;
    
    // Add example params based on endpoint parameters
    endpoint.parameters.forEach(param => {
      if (param.name !== 'authenticationKey' && param.name !== 'authenticationToken') {
        const exampleValue = getPythonExampleValue(param);
        code += `    '${param.name}': ${exampleValue},\n`;
      }
    });
    
    code += `}\n\n`;
  }
  
  code += `# Make API request\n`;
  code += `try:\n`;
  code += `    response = requests.post(f"{base_url}${endpoint.path}", data=params)\n`;
  code += `    response.raise_for_status()  # Raise exception for HTTP errors\n\n`;
  
  code += `    # Parse response\n`;
  code += `    data = response.json()\n`;
  code += `    print("Success:", data)\n\n`;
  
  if (isSearch) {
    code += `    # Handle search results\n`;
    code += `    if '${entityType}s' in data:\n`;
    code += `        print(f"Found {len(data['${entityType}s'])} results")\n`;
    code += `        # Process the results\n`;
  } else if (isGet) {
    code += `    # Handle retrieved entities\n`;
    code += `    if '${entityType}s' in data:\n`;
    code += `        print(f"Retrieved {len(data['${entityType}s'])} ${entityType}s")\n`;
    code += `        # Process the entities\n`;
  }
  
  code += `except requests.exceptions.HTTPError as e:\n`;
  code += `    print(f"HTTP Error: {e}")\n`;
  code += `except requests.exceptions.RequestException as e:\n`;
  code += `    print(f"Request Error: {e}")\n`;
  code += `except ValueError as e:\n`;
  code += `    print(f"JSON parsing error: {e}")`;
  
  return code;
}

function generateCurlExample(endpoint) {
  const entityType = endpoint.path.split('/')[1]; // Extract entity type from path
  
  let code = `# Example ${endpoint.method} request to ${endpoint.path}\n`;
  code += `curl -X POST "https://api.example.com${endpoint.path}" \\\n`;
  code += `  -H "Content-Type: application/x-www-form-urlencoded" \\\n`;
  code += `  -d "authenticationKey=YOUR_API_KEY" \\\n`;
  code += `  -d "authenticationToken=YOUR_API_TOKEN"`;
  
  // Add example params based on endpoint parameters
  endpoint.parameters.forEach(param => {
    if (param.name !== 'authenticationKey' && param.name !== 'authenticationToken') {
      const exampleValue = getCurlExampleValue(param);
      code += ` \\\n  -d "${param.name}=${exampleValue}"`;
    }
  });
  
  return code;
}

// Generate example values based on parameter name and type
function getExampleValue(param) {
    if (!param || typeof param !== 'object') return "'sample_value'";
  
    const nameStr = (param.name && typeof param.name === 'string') ? param.name.toLowerCase() : '';
  
  // Parameter-specific realistic examples
  if (nameStr.includes('id') && !nameStr.includes('ids')) return '12345';
  if (nameStr.includes('ids')) return '[12345, 67890]';
  if (nameStr.includes('email')) return "'customer@example.com'";
  if (nameStr.includes('phone')) return "'555-123-4567'";
  if (nameStr.includes('date')) return "'2025-03-08'";
  if (nameStr.includes('name')) return "'John Doe'";
  if (nameStr.includes('address')) return "'123 Main St'";
  if (nameStr.includes('city')) return "'Dallas'";
  if (nameStr.includes('state')) return "'TX'";
  if (nameStr.includes('zip')) return "'75001'";
  if (nameStr.includes('price') || nameStr.includes('amount')) return '99.95';
  if (nameStr.includes('status')) return "'active'";
  
  // Type-based defaults
  const type = param.type || 'string';
  switch (String(type).toLowerCase()) {
    case 'integer': return '123';
    case 'number': return '123.45';
    case 'boolean': return 'true';
    case 'array': return nameStr.includes('ids') ? '[12345, 67890]' : "['item1', 'item2']";
    case 'object': return "{ id: 12345, name: 'Sample Object' }";
    default: return "'sample_value'";
  }
}

function getPythonExampleValue(param) {
  if (!param || typeof param !== 'object') return "'sample_value'";
  
  const nameStr = (param.name && typeof param.name === 'string') ? param.name.toLowerCase() : '';
  
  // Parameter-specific realistic examples
  if (nameStr.includes('id') && !nameStr.includes('ids')) return '12345';
  if (nameStr.includes('ids')) return '[12345, 67890]';
  if (nameStr.includes('email')) return "'customer@example.com'";
  if (nameStr.includes('phone')) return "'555-123-4567'";
  if (nameStr.includes('date')) return "'2025-03-08'";
  if (nameStr.includes('name')) return "'John Doe'";
  if (nameStr.includes('address')) return "'123 Main St'";
  
  // Type-based defaults
  const type = param.type || 'string';
  switch (String(type).toLowerCase()) {
    case 'integer': return '123';
    case 'number': return '123.45';
    case 'boolean': return 'True';
    case 'array': return nameStr.includes('ids') ? '[12345, 67890]' : "['item1', 'item2']";
    case 'object': return "{'id': 12345, 'name': 'Sample Object'}";
    default: return "'sample_value'";
  }
}

function getCurlExampleValue(param) {
  if (!param || typeof param !== 'object') return "sample_value";
  
  const nameStr = (param.name && typeof param.name === 'string') ? param.name.toLowerCase() : '';
  
  // Parameter-specific realistic examples
  if (nameStr.includes('id') && !nameStr.includes('ids')) return '12345';
  if (nameStr.includes('ids')) return '12345';  // cURL only sends the first value by default
  if (nameStr.includes('email')) return 'customer@example.com';
  if (nameStr.includes('phone')) return '555-123-4567';
  if (nameStr.includes('date')) return '2025-03-08';
  if (nameStr.includes('name')) return 'John%20Doe';
  
  // Type-based defaults
  const type = param.type || 'string';
  switch (String(type).toLowerCase()) {
    case 'integer': return '123';
    case 'number': return '123.45';
    case 'boolean': return 'true';
    case 'array': return '12345';  // cURL only sends the first value by default
    case 'object': return 'id=12345&name=Sample%20Object';
    default: return 'sample_value';
  }
}