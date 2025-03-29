import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOpenApi } from '../contexts/OpenApiContext';
import { highlightSearchTerm, countEndpointsInCategory } from '../utils/helpers';
import { Collapse } from 'react-bootstrap';

// Inner component for rendering each category section
function CategorySection({
  category,
  searchTerm,
  allEndpoints, // Pass all endpoints for counting
  activeCategoryId,
  activeEndpointId,
  expanded,
  onCategoryClick,
  onEndpointClick,
  filteredEndpointIds // Pass IDs of filtered endpoints
}) {

  // Filter endpoints specific to this category that also match the global search
  const categoryEndpoints = useMemo(() => {
    return allEndpoints
        .filter(endpoint => endpoint.primaryTag === category.name && filteredEndpointIds.has(endpoint.id))
        .sort((a, b) => a.path.localeCompare(b.path));
  }, [allEndpoints, category.name, filteredEndpointIds]);

  const totalEndpointsInCategory = useMemo(() => {
      return countEndpointsInCategory(allEndpoints, category.name);
  }, [allEndpoints, category.name]);

  // Don't render category if search term yields no results within it
  if (searchTerm && categoryEndpoints.length === 0) {
      return null;
  }

  return (
    <div className="category mb-1" id={`category-nav-${category.id}`}>
      <button
        className={`category-header ${activeCategoryId === category.id ? 'active' : ''}`}
        onClick={() => onCategoryClick(category.id)}
        aria-expanded={expanded}
        aria-controls={`collapse-${category.id}`}
      >
        {/* Add icon if available in spec or define default */}
        <i className={`fas fa-tag category-icon`}></i>
        <span className="category-name">{category.name}</span>
        <span className="category-count ms-auto me-2">{totalEndpointsInCategory}</span>
        <i className={`fas fa-chevron-down toggle-icon ${expanded ? 'rotate' : ''}`}></i>
      </button>

      <Collapse in={expanded}>
        <div id={`collapse-${category.id}`}>
          <ul className="endpoint-list list-unstyled">
            {categoryEndpoints.map(endpoint => (
              <li className="endpoint-item" key={endpoint.id}>
                <a
                  className={`endpoint-link ${activeEndpointId === endpoint.id ? 'active' : ''}`}
                  href={`#${endpoint.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onEndpointClick(endpoint, category.id);
                  }}
                  title={`${endpoint.method} ${endpoint.path}\n${endpoint.summary || ''}`}
                >
                  <span className={`method-label method-${endpoint.method.toLowerCase()}`}>
                    {endpoint.method}
                  </span>
                  <span
                    className="endpoint-path-sidebar"
                    dangerouslySetInnerHTML={{
                      __html: searchTerm ? highlightSearchTerm(endpoint.path, searchTerm) : endpoint.path
                    }}
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Collapse>
    </div>
  );
}


function Sidebar({
  show,
  searchTerm,
  categories = [],
  endpoints = [],
  activeCategoryId,
  setActiveCategoryId,
  activeEndpointId,
  setActiveEndpointId,
}) {
  const [expandedCategories, setExpandedCategories] = useState({});

  // Effect to expand the active category or all categories if searching
  useEffect(() => {
    setExpandedCategories(prev => {
        const newState = {};
        categories.forEach(cat => {
            // Expand if searching, or if it's the active category, or keep previous state if neither
            newState[cat.id] = searchTerm ? true : (cat.id === activeCategoryId ? true : !!prev[cat.id]);
        });
        // Ensure active category is expanded if not searching
        if (!searchTerm && activeCategoryId && !newState[activeCategoryId]) {
             newState[activeCategoryId] = true;
        }
        return newState;
    });

  }, [activeCategoryId, searchTerm, categories]); // Rerun when active category or search term changes

  const handleCategoryClick = useCallback((categoryId) => {
    setActiveCategoryId(categoryId); // Set the clicked category as active
    setActiveEndpointId(null); // Deselect any active endpoint when clicking category header
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId] // Toggle expansion state
    }));

    // Scroll category into view if needed
    const categoryElement = document.getElementById(categoryId);
     if (categoryElement) {
        // Use smooth scroll into view
        categoryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
     }

  }, [setActiveCategoryId, setActiveEndpointId]);

  const handleEndpointClick = useCallback((endpoint, categoryId) => {
    setActiveEndpointId(endpoint.id);
    if (activeCategoryId !== categoryId) {
        setActiveCategoryId(categoryId); // Ensure parent category is active
         // Expand the new category if it wasn't already
         setExpandedCategories(prev => ({...prev, [categoryId]: true}));
    }

    // Set the hash without triggering default scroll behavior immediately
    history.pushState(null, null, `#${endpoint.id}`);

    // Scroll the endpoint card into view with offset
    const element = document.getElementById(endpoint.id);
    if (element) {
      const yOffset = -130; // Adjust offset for fixed navbar + sticky category header
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, [activeCategoryId, setActiveEndpointId, setActiveCategoryId]);

  // Memoize the set of filtered endpoint IDs based on the search term
  const filteredEndpointIds = useMemo(() => {
      const lowerSearch = searchTerm.toLowerCase();
      if (!lowerSearch) {
          // If no search term, all endpoints are potentially visible (category filter happens later)
          return new Set(endpoints.map(ep => ep.id));
      }
      const filteredIds = new Set();
      endpoints.forEach(endpoint => {
          if (
              endpoint.path.toLowerCase().includes(lowerSearch) ||
              (endpoint.summary && endpoint.summary.toLowerCase().includes(lowerSearch)) ||
              (endpoint.description && endpoint.description.toLowerCase().includes(lowerSearch)) ||
              (endpoint.operationId && endpoint.operationId.toLowerCase().includes(lowerSearch)) ||
              (endpoint.tags && endpoint.tags.some(tag => tag.toLowerCase().includes(lowerSearch)))
          ) {
              filteredIds.add(endpoint.id);
          }
      });
      return filteredIds;
  }, [endpoints, searchTerm]);


  // Handle "All Tags" selection
  const selectAllTags = () => {
      setActiveCategoryId('all-tags');
      setActiveEndpointId(null);
      // Optionally expand all categories when "All" is clicked
      const allExpanded = {};
      categories.forEach(cat => { allExpanded[cat.id] = true; });
      setExpandedCategories(allExpanded);
  };


  return (
    <div className={`sidebar ${show ? 'show' : ''}`} id="sidebar">
      {/* Sidebar Header can be added back if needed for search or filters */}
      {/* <div className="sidebar-header">...</div> */}

      <div className="categories-wrapper pt-2">
         {/* "All Tags" Button */}
         <div className="category mb-1">
             <button
                 className={`category-header all-tags-header ${activeCategoryId === 'all-tags' || !activeCategoryId ? 'active' : ''}`}
                 onClick={selectAllTags}
             >
                 <i className="fas fa-list category-icon"></i>
                 <span className="category-name">All Endpoints</span>
                 {/* Optionally show total count */}
                 <span className="category-count ms-auto me-2">{endpoints.length}</span>
             </button>
         </div>

         {/* Separator */}
         <hr className="my-1" />

         {categories
            .sort((a, b) => a.name.localeCompare(b.name)) // Sort categories alphabetically
            .map((category) => (
                <CategorySection
                    key={category.id}
                    category={category}
                    searchTerm={searchTerm}
                    allEndpoints={endpoints}
                    activeCategoryId={activeCategoryId}
                    activeEndpointId={activeEndpointId}
                    expanded={!!expandedCategories[category.id]}
                    onCategoryClick={handleCategoryClick}
                    onEndpointClick={handleEndpointClick}
                    filteredEndpointIds={filteredEndpointIds} // Pass the filtered IDs
                />
         ))}
      </div>
    </div>
  );
}

export default Sidebar;
