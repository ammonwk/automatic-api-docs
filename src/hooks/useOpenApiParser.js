import { useState, useCallback } from 'react';
import jsyaml from 'js-yaml';
import { createSafeId } from '../utils/helpers';

// Basic $ref resolver (can be enhanced for external/complex refs)
const resolveRef = (ref, spec) => {
  if (!ref || typeof ref !== 'string' || !spec || !ref.startsWith('#/')) {
      // If it's not a valid internal ref string, return the original value
      // This handles cases where a schema object is directly provided instead of a $ref
      return ref;
  }
  const path = ref.substring(2).split('/');
  let current = spec;
  try {
      for (const key of path) {
          if (current && typeof current === 'object' && key in current) {
              current = current[key];
          } else {
              console.warn(`Could not resolve reference: ${ref}`);
              return null; // Indicate resolution failure
          }
      }
      return current;
  } catch (error) {
      console.error(`Error resolving reference ${ref}:`, error);
      return null;
  }
};


// Function to recursively resolve all $refs within an object or array
const resolveAllRefs = (input, spec) => {
    if (Array.isArray(input)) {
        return input.map(item => resolveAllRefs(item, spec));
    } else if (typeof input === 'object' && input !== null) {
        if (input.$ref) {
            const resolved = resolveRef(input.$ref, spec);
            // Recursively resolve refs within the resolved component
            // Add check to prevent infinite loops with circular refs (basic depth limit or path tracking)
            // For simplicity here, we just resolve one level deep from the ref.
            // A more robust solution would track visited paths.
            return resolveAllRefs(resolved, spec);
        } else {
            const newObj = {};
            for (const key in input) {
                newObj[key] = resolveAllRefs(input[key], spec);
            }
            return newObj;
        }
    }
    return input; // Return primitive values as is
};


function transformOpenApiData(spec) {
  if (!spec || !spec.openapi || !spec.paths) {
    throw new Error("Invalid OpenAPI specification: Missing 'openapi' version or 'paths'.");
  }

  const endpoints = [];
  const tagsMap = new Map(); // To store tag descriptions and ensure uniqueness

  // Process global tags first
  if (spec.tags && Array.isArray(spec.tags)) {
    spec.tags.forEach(tag => {
      if (tag.name && !tagsMap.has(tag.name)) { // Add only if not already present
        tagsMap.set(tag.name, {
          description: tag.description || '',
          externalDocs: tag.externalDocs,
          id: createSafeId(tag.name) // Pre-generate ID
        });
      }
    });
  }

  Object.entries(spec.paths).forEach(([path, pathItem]) => {
    if (!pathItem) return; // Skip empty path items

    // Resolve path-level parameters
    const pathParameters = (pathItem.parameters || []).map(p => resolveRef(p.$ref, spec) || p);

    Object.entries(pathItem).forEach(([method, operation]) => {
      const validMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
      if (!validMethods.includes(method.toLowerCase()) || !operation || typeof operation !== 'object') {
          return; // Skip non-method entries or invalid operations
      }

      // Resolve operation-level parameters
      const operationParameters = (operation.parameters || []).map(p => resolveRef(p.$ref, spec) || p);

      // Combine path and operation parameters, ensuring uniqueness by name+in
      const combinedParams = [...pathParameters];
      operationParameters.forEach(opParam => {
        if (opParam && opParam.name && opParam.in && !combinedParams.some(p => p.name === opParam.name && p.in === opParam.in)) {
          combinedParams.push(opParam);
        }
      });

      // Resolve requestBody
      let requestBody = null;
      if (operation.requestBody) {
          requestBody = resolveRef(operation.requestBody.$ref, spec) || operation.requestBody;
          // Resolve schema within content types
          if (requestBody.content) {
              Object.keys(requestBody.content).forEach(contentType => {
                  if (requestBody.content[contentType].schema) {
                      requestBody.content[contentType].schema = resolveRef(requestBody.content[contentType].schema.$ref, spec) || requestBody.content[contentType].schema;
                  }
              });
          }
      }

      // Process responses, resolving schemas
      const responses = {};
      if (operation.responses) {
        Object.entries(operation.responses).forEach(([code, resp]) => {
          const resolvedResp = resolveRef(resp.$ref, spec) || resp;
          if (resolvedResp && resolvedResp.content) {
              Object.keys(resolvedResp.content).forEach(contentType => {
                  if (resolvedResp.content[contentType].schema) {
                      resolvedResp.content[contentType].schema = resolveRef(resolvedResp.content[contentType].schema.$ref, spec) || resolvedResp.content[contentType].schema;
                  }
              });
          }
          responses[code] = resolvedResp;
        });
      }

      // Determine tags for categorization, default if none
      const tags = (operation.tags && operation.tags.length > 0) ? operation.tags : ['default'];
      const primaryTag = tags[0];

      // Ensure the primary tag exists in our map
      if (!tagsMap.has(primaryTag)) {
        tagsMap.set(primaryTag, {
            description: '', // Add default tag if not defined globally
            id: createSafeId(primaryTag)
        });
      }

      // Create unique ID (prefer operationId, fallback to method/path)
      const opId = operation.operationId || `${method}${path.replace(/[\/{}]/g, '_')}`;
      const id = createSafeId(opId);

      endpoints.push({
        id: id,
        operationId: operation.operationId,
        path: path,
        method: method.toUpperCase(),
        summary: operation.summary || '',
        description: operation.description || '',
        parameters: combinedParams, // Store resolved parameters
        requestBody: requestBody, // Store resolved requestBody
        responses: responses,     // Store resolved responses
        tags: tags,
        primaryTag: primaryTag,
        security: operation.security || spec.security || [],
        deprecated: operation.deprecated || false,
        servers: operation.servers || pathItem.servers || spec.servers || [],
        externalDocs: operation.externalDocs,
      });
    });
  });

  // Convert tags map to array format expected by components
  const categories = Array.from(tagsMap.values()).map(data => ({ // Use .values()
      name: Array.from(tagsMap.keys()).find(key => tagsMap.get(key) === data), // Find name back
      description: data.description,
      id: data.id,
      externalDocs: data.externalDocs
  }));

  const info = spec.info || { title: 'API Documentation', version: '1.0' };

  // Resolve remaining refs in components (schemas, securitySchemes)
  const resolvedComponents = resolveAllRefs(spec.components, spec);

  return {
    title: info.title,
    description: info.description || '',
    version: info.version,
    servers: spec.servers || [],
    // Use resolved components
    components: resolvedComponents || {},
    securitySchemes: resolvedComponents?.securitySchemes || {},
    endpoints: endpoints,
    categories: categories,
    _rawSpec: spec, // Keep raw spec for potential deep dives
  };
}


export function useOpenApiParser() {
  const [parsedSpec, setParsedSpec] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawSpecString, setRawSpecString] = useState('');

  const loadSpec = useCallback(async (specString, optionalError = null) => {
    if (optionalError) {
        setError(optionalError);
        setIsLoading(false);
        setParsedSpec(null);
        setRawSpecString('');
        return;
    }
    if (!specString || typeof specString !== 'string' || !specString.trim()) {
      setError("No specification content provided.");
      setParsedSpec(null);
      setRawSpecString('');
      return;
    }

    setIsLoading(true);
    setError(null);
    setParsedSpec(null);
    setRawSpecString(specString);

    // Use setTimeout to allow UI to update *before* heavy parsing/transform
    setTimeout(() => {
        try {
            let specObject;
            // Basic check for JSON vs YAML
            if (specString.trim().startsWith('{') && specString.trim().endsWith('}')) {
                specObject = JSON.parse(specString);
            } else {
                specObject = jsyaml.load(specString);
            }

            if (typeof specObject !== 'object' || specObject === null) {
                throw new Error("Parsed content is not a valid object.");
            }

            // --- Transformation Step ---
            const transformedData = transformOpenApiData(specObject);
            setParsedSpec(transformedData);
            // --- End Transformation ---

        } catch (err) {
            console.error("Parsing/Transformation Error:", err);
            let message = `Failed to parse or process specification: ${err.message}`;
            if (err instanceof jsyaml.YAMLException) {
                message = `YAML Parsing Error: ${err.message} at line ${err.mark?.line}, column ${err.mark?.column}`;
            } else if (err instanceof SyntaxError) {
                 message = `JSON Parsing Error: ${err.message}`;
            }
            setError(message);
            setParsedSpec(null);
        } finally {
            setIsLoading(false);
        }
    }, 50); // 50ms delay

  }, []);

  const clearSpec = useCallback(() => {
    setParsedSpec(null);
    setError(null);
    setIsLoading(false);
    setRawSpecString('');
  }, []);

  return {
    parsedSpec,
    isLoading,
    error,
    loadSpec,
    clearSpec,
    rawSpecString
  };
}
