// src/App.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import EndpointCard from './components/EndpointCard';
import SpecInput from './components/SpecInput';
import NoSpecLoaded from './components/NoSpecLoaded';
import { useOpenApi } from './contexts/OpenApiContext';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useDebounce } from './hooks/useDebounce';
import {  getResponseSchema, searchInSchema, getRequestBodySchema } from './utils/helpers'; // Ensure highlightSearchTerm is imported if used directly here (it's passed down)
import './App.css';

function App() {
  const {
    parsedSpec,
    isLoading: isParsing,
    error: parseError,
    loadSpec,
    clearSpec,
    activeCategoryId,
    setActiveCategoryId,
    activeEndpointId,
    setActiveEndpointId,
  } = useOpenApi();

  const [showSidebar, setShowSidebar] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useLocalStorage('darkMode', false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  // Filter endpoints based ONLY on search term
  const getFilteredEndpoints = useCallback(() => {
    if (!parsedSpec?.endpoints) return [];

    const lowerSearch = debouncedSearchTerm.toLowerCase().trim();

    // If no search term, return ALL endpoints (return a copy)
    // We still might want to sort them by original order or path later if needed
    if (!lowerSearch) {
      return [...parsedSpec.endpoints];
    }

    // If search term exists, score ALL endpoints based on the search term
    const scoredEndpoints = [];
    parsedSpec.endpoints.forEach(endpoint => {
        // Calculate Score based on search term matches
        let score = 0;
        let found = false; // Track if any match occurred

        // --- Scoring Weights ---
        const WEIGHTS = {
            PATH: 15,
            SUMMARY: 10,
            OPERATION_ID: 10,
            TAG: 8,
            PARAM_NAME: 7,
            RESPONSE_CODE: 6,
            SCHEMA_PROP_NAME: 5,
            DESCRIPTION: 2,
            SCHEMA_DESCRIPTION: 1,
            OTHER: 1,
        };
        // -----------------------------------------

        const checkAndScore = (text, weight) => {
            if (text && typeof text === 'string' && text.toLowerCase().includes(lowerSearch)) {
                score += weight;
                found = true;
                return true;
            }
            return false;
        };

         const checkSchemaAndScore = (schema, weightPropName, weightDesc, weightOther) => {
             if (!schema) return false;
             let schemaFound = false;
              if (schema.type === 'object' && schema.properties) {
                  for (const propName in schema.properties) {
                      if (propName.toLowerCase().includes(lowerSearch)) {
                          score += weightPropName; found = true; schemaFound = true;
                      }
                       if (schema.properties[propName]?.description?.toLowerCase().includes(lowerSearch)) {
                           score += weightDesc; found = true; schemaFound = true;
                       }
                  }
              }
               if (schema.description?.toLowerCase().includes(lowerSearch)) {
                    score += weightDesc; found = true; schemaFound = true;
               }
              if (searchInSchema(schema, lowerSearch)) {
                   score += weightOther; found = true; schemaFound = true;
              }
              return schemaFound;
         }

        // Check Endpoint Fields
        checkAndScore(endpoint.path, WEIGHTS.PATH);
        checkAndScore(endpoint.summary, WEIGHTS.SUMMARY);
        checkAndScore(endpoint.operationId, WEIGHTS.OPERATION_ID);
        checkAndScore(endpoint.description, WEIGHTS.DESCRIPTION);
        if (endpoint.tags?.some(tag => checkAndScore(tag, WEIGHTS.TAG))) {}

        // Check Parameters
        endpoint.parameters?.forEach(param => {
            checkAndScore(param.name, WEIGHTS.PARAM_NAME);
            checkAndScore(param.description, WEIGHTS.DESCRIPTION);
            checkSchemaAndScore(param.schema, WEIGHTS.SCHEMA_PROP_NAME, WEIGHTS.SCHEMA_DESCRIPTION, WEIGHTS.OTHER);
        });

        // Check Request Body
        if (endpoint.requestBody) {
            checkAndScore(endpoint.requestBody.description, WEIGHTS.DESCRIPTION);
            const reqSchema = getRequestBodySchema(endpoint.requestBody);
            checkSchemaAndScore(reqSchema, WEIGHTS.SCHEMA_PROP_NAME, WEIGHTS.SCHEMA_DESCRIPTION, WEIGHTS.OTHER);
        }

        // Check Responses
        if (endpoint.responses) {
            Object.entries(endpoint.responses).forEach(([code, resp]) => {
                checkAndScore(code, WEIGHTS.RESPONSE_CODE);
                checkAndScore(resp.description, WEIGHTS.DESCRIPTION);
                const respSchema = getResponseSchema(resp);
                checkSchemaAndScore(respSchema, WEIGHTS.SCHEMA_PROP_NAME, WEIGHTS.SCHEMA_DESCRIPTION, WEIGHTS.OTHER);
            });
        }

        // Only add if found and score > 0
        if (found && score > 0) {
            scoredEndpoints.push({ endpoint, score });
        }
    });

    // Sort by score (descending), then path (ascending) as a tie-breaker
    scoredEndpoints.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.endpoint.path.localeCompare(b.endpoint.path);
    });

    // Return just the sorted endpoint objects
    return scoredEndpoints.map(item => item.endpoint);

  }, [parsedSpec, debouncedSearchTerm]);


  // Memoize grouped endpoints (adapts automatically to list from getFilteredEndpoints)
  const groupedEndpoints = useMemo(() => {
    if (!parsedSpec?.categories) return [];
    const groups = {};
    const endpointsToDisplay = getFilteredEndpoints(); // Gets the SEARCH-filtered (and possibly sorted) list

    // Initialize groups for all categories to maintain original spec order if possible
    parsedSpec.categories.forEach(category => {
        groups[category.name] = [];
    });

    // Populate groups with filtered & sorted endpoints
    endpointsToDisplay.forEach(endpoint => {
        if (groups[endpoint.primaryTag]) {
            groups[endpoint.primaryTag].push(endpoint);
        } else {
            // Fallback group if tag not in global list (shouldn't happen often)
            if (!groups['default']) groups['default'] = [];
            groups['default'].push(endpoint);
        }
    });

    // Convert to array and filter out empty categories (empty ONLY if search excludes all endpoints in it)
    // Then sort categories by original spec order
    return Object.entries(groups)
        .filter(([, endpoints]) => endpoints.length > 0)
        .sort(([a], [b]) => {
            const idxA = parsedSpec.categories.findIndex(c => c.name === a);
            const idxB = parsedSpec.categories.findIndex(c => c.name === b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (a === 'default') return 1;
            if (b === 'default') return -1;
            return a.localeCompare(b);
        });

  }, [parsedSpec, getFilteredEndpoints]); // Depends on the result of the filtering function

  const toggleSidebar = useCallback(() => setShowSidebar(prev => !prev), []);
  const toggleDarkMode = useCallback(() => setDarkMode(prev => !prev), [setDarkMode]);
  const handleSearch = useCallback((term) => setSearchTerm(term), []);

  // Handle initial hash scrolling or selecting first category/endpoint
  useEffect(() => {
    if (parsedSpec && !isParsing && !parseError) {
        const hash = window.location.hash.substring(1);
        let scrolled = false;

        if (hash) {
            const element = document.getElementById(hash);
            if (element) {
                // Attempt to scroll to hash element
                setTimeout(() => {
                    const yOffset = -130; // Adjusted offset
                    const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'auto' }); // Use 'auto' for instant jump on load
                }, 100);

                // Set active state based on hash
                const endpoint = parsedSpec.endpoints.find(ep => ep.id === hash);
                if (endpoint) {
                    setActiveEndpointId(endpoint.id);
                    const category = parsedSpec.categories.find(cat => cat.name === endpoint.primaryTag);
                    if (category) {
                        setActiveCategoryId(category.id);
                    }
                } else {
                     const category = parsedSpec.categories.find(cat => cat.id === hash);
                     if (category) {
                         setActiveCategoryId(category.id);
                         setActiveEndpointId(null);
                     }
                }
                scrolled = true;
            }
        }

        // If no hash or hash didn't match, select 'all-tags' if none is active
        if (!scrolled && !activeCategoryId && parsedSpec.categories.length > 0) {
            setActiveCategoryId('all-tags'); // Default to selecting 'All' visually
            setActiveEndpointId(null);
        }
    }
  }, [parsedSpec, isParsing, parseError, activeCategoryId, setActiveCategoryId, setActiveEndpointId]);


  return (
    <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
      <Navbar
        title={parsedSpec?.title || 'OpenAPI Viewer'}
        version={parsedSpec?.version}
        onToggleSidebar={toggleSidebar}
        onToggleDarkMode={toggleDarkMode}
        darkMode={darkMode}
        onSearch={handleSearch}
        onClearSpec={clearSpec}
        hasSpec={!!parsedSpec && !parseError}
      />

      <div className="container-fluid">
        <div className="row flex-nowrap">
          {parsedSpec && !parseError && (
            <Sidebar
              show={showSidebar}
              searchTerm={debouncedSearchTerm}
              categories={parsedSpec.categories || []}
              endpoints={parsedSpec.endpoints || []}
              activeCategoryId={activeCategoryId}
              setActiveCategoryId={setActiveCategoryId}
              activeEndpointId={activeEndpointId}
              setActiveEndpointId={setActiveEndpointId}
            />
          )}

          <main className={`main-content ${!parsedSpec || parseError ? 'no-spec' : ''} ${!showSidebar && parsedSpec && !parseError ? 'sidebar-hidden' : ''}`}>
            {!parsedSpec && !isParsing && !parseError ? (
              <SpecInput onLoadSpec={loadSpec} isLoading={isParsing} error={parseError} />
            ) : isParsing ? (
              <div className="loading-spinner">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading Specification...</span>
                </div>
                <p>Loading Specification...</p>
              </div>
            ) : parseError ? (
               <SpecInput onLoadSpec={loadSpec} isLoading={isParsing} error={parseError} />
            ) : (
              // Render documentation content
              <div id="content-container">
                {groupedEndpoints.length > 0 ? (
                  groupedEndpoints.map(([categoryName, endpoints]) => {
                     const category = parsedSpec.categories.find(c => c.name === categoryName);
                     if (!category) return null;
                     return (
                        <div key={category.id} className="category-section">
                            <h3 className="category-title" id={category.id}>
                            {category.name}
                            {category.description && <small className="category-description d-block text-muted fw-normal">{category.description}</small>}
                            </h3>
                            <div className="category-endpoints">
                            {endpoints.map(endpoint => (
                                <EndpointCard
                                    key={endpoint.id}
                                    endpoint={endpoint}
                                    spec={parsedSpec._rawSpec}
                                    searchTerm={debouncedSearchTerm} // Pass search term for highlighting
                                />
                            ))}
                            </div>
                        </div>
                     )
                  })
                ) : (
                   // This message shows if SEARCH yields no results, or if spec has 0 endpoints
                   <NoSpecLoaded message={debouncedSearchTerm ? "No endpoints match your search criteria." : "No endpoints found in this specification."} />
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;