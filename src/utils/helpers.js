/**
 * Counts the number of endpoints associated with a specific tag name.
 * @param {Array} endpoints - The list of all endpoint objects.
 * @param {string} tagName - The name of the tag (category) to count.
 * @returns {number} The count of endpoints for that tag.
 */
export function countEndpointsInCategory(endpoints = [], tagName) {
    if (!tagName) return 0;
    return endpoints.filter(endpoint => endpoint.primaryTag === tagName).length;
}

/**
 * Highlights search terms within a given text string.
 * @param {string} text - The text to search within.
 * @param {string} searchTerm - The term to highlight.
 * @returns {string} The text with matching terms wrapped in <span class="highlight">.
 */
export function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm || !text) return text || '';

    try {
        // Escape special characters in the search term for regex safety
        const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    } catch (e) {
        console.error("Error creating regex for highlighting:", e);
        return text; // Return original text on regex error
    }
}

/**
 * Creates a URL-friendly and safe ID string from a given input string.
 * @param {string} str - The input string.
 * @returns {string} The generated safe ID.
 */
export function createSafeId(str) {
    if (!str || typeof str !== 'string') return `id-${Math.random().toString(36).substring(2, 9)}`; // Fallback ID

    return str
        .toLowerCase()
        .replace(/[^a-z0-9\s_-]/g, '') // Remove invalid characters except space, underscore, hyphen
        .trim() // Remove leading/trailing whitespace
        .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, multiple hyphens with a single hyphen
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}


/**
 * Generates a smart example value based on OpenAPI schema and parameter/property name.
 * Handles basic types, formats, and common names.
 * @param {object} schema - The OpenAPI schema object for the parameter/property.
 * @param {string} nameHint - The name of the parameter or property (e.g., 'userId', 'email').
 * @returns {any} An example value suitable for the schema.
 */
export function getSmartExampleValue(schema, nameHint = '') {
    if (!schema) return 'unknown';

    // Use example from schema if available
    if (schema.example !== undefined) return schema.example;
    if (schema.default !== undefined) return schema.default;
    if (schema.enum?.length > 0) return schema.enum[0]; // Use first enum value

    const nameStr = typeof nameHint === 'string' ? nameHint.toLowerCase() : '';
    const type = schema.type || 'string';
    const format = schema.format || '';

    // Name-based heuristics
    if (nameStr === 'id' || nameStr.endsWith('id') || nameStr.endsWith('_id')) return type === 'string' ? `id_${Math.random().toString(36).substring(2, 9)}` : Math.floor(Math.random() * 10000) + 1;
    if (nameStr.includes('email')) return 'user@example.com';
    if (nameStr.includes('phone')) return '555-123-4567';
    if (nameStr.includes('url') || nameStr.includes('uri')) return 'https://example.com/path';
    if (nameStr.includes('uuid') || format === 'uuid') return '123e4567-e89b-12d3-a456-426614174000';
    if (nameStr.includes('date') && format !== 'date-time') return '2024-12-31';
    if (nameStr.includes('time') || format === 'date-time') return new Date().toISOString();
    if (nameStr.includes('timestamp')) return Date.now();
    if (nameStr.includes('name')) {
        if (nameStr.includes('first')) return 'John';
        if (nameStr.includes('last')) return 'Doe';
        return 'Example Name';
    }
    if (nameStr.includes('address')) return '123 Main St';
    if (nameStr.includes('city')) return 'Anytown';
    if (nameStr.includes('state') || nameStr.includes('province')) return 'CA';
    if (nameStr.includes('zip') || nameStr.includes('postal')) return '90210';
    if (nameStr.includes('country')) return 'US';
    if (nameStr.includes('price') || nameStr.includes('amount') || nameStr.includes('cost')) return 99.99;
    if (nameStr.includes('status')) return 'active';
    if (nameStr.includes('type')) return 'standard';
    if (nameStr.includes('description')) return 'A sample description.';
    if (nameStr.includes('limit')) return 25;
    if (nameStr.includes('offset') || nameStr.includes('skip')) return 0;
    if (nameStr.includes('page')) return 1;
    if (nameStr.includes('count') || nameStr.includes('total')) return 100;
    if (nameStr.includes('latitude')) return 34.0522;
    if (nameStr.includes('longitude')) return -118.2437;
    if (nameStr.includes('tag') || nameStr.includes('keyword')) return 'example-tag';
    if (nameStr.includes('token')) return 'abc123xyz789';
    if (nameStr.includes('password') || nameStr.includes('secret')) return '********';


    // Type/Format-based generation
    switch (type) {
        case 'integer':
            if (format === 'int64') return 1000000000;
            return 123;
        case 'number':
            if (format === 'float') return 123.45;
            if (format === 'double') return 123.456789;
            return 99.9;
        case 'boolean':
            return true;
        case 'string':
            if (format === 'byte') return 'U3dhZ2dlciByb2Nrcw=='; // Base64 example
            if (format === 'binary') return '<binary data>';
            if (format === 'date') return '2024-12-31';
            if (format === 'date-time') return new Date().toISOString();
            if (format === 'password') return '********';
            return 'sample_string';
        case 'array':
            // Generate one example item for the array
            const itemSchema = schema.items || { type: 'string' };
            return [getSmartExampleValue(itemSchema, nameStr + '_item')];
        case 'object':
            // Generate example for first few properties if defined
            const objExample = {};
            if (schema.properties) {
                Object.entries(schema.properties).slice(0, 3).forEach(([propName, propSchema]) => {
                    objExample[propName] = getSmartExampleValue(propSchema, propName);
                });
            } else {
                objExample['key'] = 'value'; // Generic object
            }
            return objExample;
        default:
            return 'unknown_type';
    }
}

/**
 * Generates a smart example value specifically formatted for Python code examples.
 * @param {object} schema - The OpenAPI schema object.
 * @param {string} nameHint - The name of the parameter or property.
 * @returns {string} A string representation of the example value for Python.
 */
export function getSmartExampleValuePython(schema, nameHint = '') {
    const value = getSmartExampleValue(schema, nameHint); // Get base value

    // Format for Python
    if (typeof value === 'string') {
        // Escape quotes within the string if necessary
        return `'${value.replace(/'/g, "\\'")}'`;
    }
    if (typeof value === 'boolean') {
        return value ? 'True' : 'False'; // Python uses True/False
    }
    if (value === null) {
        return 'None'; // Python uses None
    }
    if (Array.isArray(value)) {
        // Recursively format items in the array
        return `[${value.map(item => getSmartExampleValuePython(schema.items || {}, nameHint + '_item')).join(', ')}]`;
    }
    if (typeof value === 'object') {
        // Recursively format key-value pairs in the object
        const props = schema?.properties || {};
        return `{${Object.entries(value)
            .map(([key, val]) => `'${key}': ${getSmartExampleValuePython(props[key] || {}, key)}`)
            .join(', ')}}`;
    }
    // For numbers or other types, convert directly to string
    return String(value);
}


/**
 * Generates an example JSON response string based on the first successful response schema.
 * @param {object} endpoint - The transformed endpoint object.
 * @param {object} spec - The raw OpenAPI spec (needed for potential deep $ref resolution).
 * @returns {string} A formatted JSON string representing an example response.
 */
export function generateExampleResponse(endpoint, spec) {
    if (!endpoint?.responses) {
        return JSON.stringify({ message: "No response definition found." }, null, 2);
    }

    // Find the first success (2xx) response with a schema
    const successCode = Object.keys(endpoint.responses).find(code => code.startsWith('2'));
    const responseDef = successCode ? endpoint.responses[successCode] : null;

    if (!responseDef) {
         return JSON.stringify({ message: `No success (2xx) response definition found.` }, null, 2);
    }

    // Determine content type and schema
    const contentType = getContentType(responseDef);
    const schema = responseDef.content?.[contentType]?.schema;

    if (!schema) {
        return JSON.stringify({ message: `Success response (${successCode}) defined, but no schema found for content type '${contentType || 'any'}'.` }, null, 2);
    }

    try {
        const exampleValue = getSmartExampleValue(schema, 'responseRoot');
        return JSON.stringify(exampleValue, null, 2); // Pretty print
    } catch (e) {
        console.error("Error generating example response:", e);
        return JSON.stringify({ error: "Could not generate example response.", details: e.message }, null, 2);
    }
}

/**
 * Extracts the most likely content type from a requestBody or response definition.
 * Prefers JSON, then form-urlencoded, then the first available type.
 * @param {object} definition - The requestBody or response object.
 * @returns {string|null} The determined content type or null.
 */
export function getContentType(definition) {
    if (!definition?.content) return null;
    const contentTypes = Object.keys(definition.content);
    if (contentTypes.includes('application/json')) return 'application/json';
    if (contentTypes.includes('application/x-www-form-urlencoded')) return 'application/x-www-form-urlencoded';
    if (contentTypes.includes('multipart/form-data')) return 'multipart/form-data'; // Added multipart
    if (contentTypes.includes('text/plain')) return 'text/plain';
     // Add other common types if needed (e.g., application/xml)
    return contentTypes[0] || null; // Fallback to the first defined type
}

/**
 * Extracts the schema from a requestBody definition based on the preferred content type.
 * @param {object} requestBody - The requestBody object.
 * @returns {object|null} The schema object or null.
 */
export function getRequestBodySchema(requestBody) {
    if (!requestBody?.content) return null;
    const preferredContentType = getContentType(requestBody);
    return requestBody.content[preferredContentType]?.schema || null;
}
