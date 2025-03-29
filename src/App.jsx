import { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import EndpointCard from './components/EndpointCard';
import SpecInput from './components/SpecInput';
import NoSpecLoaded from './components/NoSpecLoaded';
import { useOpenApi } from './contexts/OpenApiContext';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useDebounce } from './hooks/useDebounce';
import { createSafeId } from './utils/helpers';
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

  // Filter endpoints based on search term and active category
  const getFilteredEndpoints = useCallback(() => {
    if (!parsedSpec?.endpoints) return [];

    const lowerSearch = debouncedSearchTerm.toLowerCase();
    const currentCategoryId = activeCategoryId; // Use the state directly

    return parsedSpec.endpoints.filter(endpoint => {
      // Filter by Category (Tag ID)
      const categoryData = parsedSpec.categories.find(cat => cat.name === endpoint.primaryTag);
      const endpointCategoryId = categoryData ? categoryData.id : createSafeId(endpoint.primaryTag); // Get ID or generate one

      const categoryMatch = !currentCategoryId || currentCategoryId === 'all-tags' || endpointCategoryId === currentCategoryId;
      if (!categoryMatch) return false;

      // Filter by Search Term
      const searchMatch = !lowerSearch ||
        endpoint.path.toLowerCase().includes(lowerSearch) ||
        (endpoint.summary && endpoint.summary.toLowerCase().includes(lowerSearch)) ||
        (endpoint.description && endpoint.description.toLowerCase().includes(lowerSearch)) ||
        (endpoint.operationId && endpoint.operationId.toLowerCase().includes(lowerSearch)) ||
        (endpoint.tags && endpoint.tags.some(tag => tag.toLowerCase().includes(lowerSearch)));

      return searchMatch;
    });
  }, [parsedSpec, debouncedSearchTerm, activeCategoryId]);


  // Memoize grouped endpoints for rendering
  const groupedEndpoints = useMemo(() => {
    if (!parsedSpec?.categories) return [];
    const groups = {};
    const endpointsToDisplay = getFilteredEndpoints(); // Get filtered list

    // Initialize groups for all categories to maintain order
    parsedSpec.categories.forEach(category => {
      groups[category.name] = [];
    });

     // Populate groups with filtered endpoints
    endpointsToDisplay.forEach(endpoint => {
        if (groups[endpoint.primaryTag]) {
            groups[endpoint.primaryTag].push(endpoint);
        } else {
            // Handle endpoints with tags not in the global list (though transformOpenApiData should prevent this)
             if (!groups['default']) groups['default'] = [];
             groups['default'].push(endpoint);
        }
    });

    // Sort endpoints within each group
    Object.values(groups).forEach(group => group.sort((a, b) => a.path.localeCompare(b.path)));

    // Convert to array and filter out empty categories, then sort categories
    return Object.entries(groups)
               .filter(([, endpoints]) => endpoints.length > 0)
               .sort(([a], [b]) => {
                   // Find original category order if possible, otherwise alphabetical
                   const idxA = parsedSpec.categories.findIndex(c => c.name === a);
                   const idxB = parsedSpec.categories.findIndex(c => c.name === b);
                   if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                   return a.localeCompare(b);
                });

  }, [parsedSpec, getFilteredEndpoints]);


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
                }, 100); // Delay for layout stability

                // Set active state based on hash
                const endpoint = parsedSpec.endpoints.find(ep => ep.id === hash);
                if (endpoint) {
                    setActiveEndpointId(endpoint.id);
                    const category = parsedSpec.categories.find(cat => cat.name === endpoint.primaryTag);
                    if (category) {
                        setActiveCategoryId(category.id);
                    }
                } else {
                     // If hash matches a category ID
                     const category = parsedSpec.categories.find(cat => cat.id === hash);
                     if (category) {
                         setActiveCategoryId(category.id);
                         setActiveEndpointId(null); // No specific endpoint selected
                     }
                }
                scrolled = true;
            }
        }

        // If no hash or hash didn't match, select the first category if none is active
        if (!scrolled && !activeCategoryId && parsedSpec.categories.length > 0) {
            setActiveCategoryId(parsedSpec.categories[0].id);
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
        hasSpec={!!parsedSpec && !parseError} // Only true if spec loaded without error
      />

      <div className="container-fluid">
        <div className="row flex-nowrap"> {/* Prevent wrapping */}
          {parsedSpec && !parseError && (
            <Sidebar
              show={showSidebar}
              searchTerm={debouncedSearchTerm} // Pass debounced term
              categories={parsedSpec.categories || []}
              endpoints={parsedSpec.endpoints || []} // Pass all endpoints for counting
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
               // Show SpecInput again with the error message
               <SpecInput onLoadSpec={loadSpec} isLoading={isParsing} error={parseError} />
            ) : (
              // Render documentation content
              <div id="content-container">
                {groupedEndpoints.length > 0 ? (
                  groupedEndpoints.map(([categoryName, endpoints]) => {
                     const category = parsedSpec.categories.find(c => c.name === categoryName);
                     if (!category) return null; // Should not happen if transform is correct
                     return (
                        <div key={category.id} className="category-section">
                            <h3 className="category-title" id={category.id}>
                            {/* Linkable category title */}
                            {category.name}
                            {category.description && <small className="category-description d-block text-muted fw-normal">{category.description}</small>}
                            </h3>
                            <div className="category-endpoints">
                            {endpoints.map(endpoint => (
                                <EndpointCard key={endpoint.id} endpoint={endpoint} spec={parsedSpec._rawSpec} />
                            ))}
                            </div>
                        </div>
                     )
                  })
                ) : (
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
