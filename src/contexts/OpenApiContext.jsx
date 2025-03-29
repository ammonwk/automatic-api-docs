import React, { createContext, useState, useContext, useCallback } from 'react';
import { useOpenApiParser } from '../hooks/useOpenApiParser';

const OpenApiContext = createContext(undefined);

export const useOpenApi = () => {
    const context = useContext(OpenApiContext);
    if (context === undefined) {
        throw new Error('useOpenApi must be used within an OpenApiProvider');
    }
    return context;
};

export const OpenApiProvider = ({ children }) => {
  const parser = useOpenApiParser();
  const [activeEndpointId, setActiveEndpointId] = useState(null);
  const [activeCategoryId, setActiveCategoryId] = useState(null); // Store category ID

  // Add clear function that also resets active IDs
   const clearSpecAndState = useCallback(() => {
        parser.clearSpec();
        setActiveEndpointId(null);
        setActiveCategoryId(null);
        // Clear hash from URL
        if (window.location.hash) {
            history.pushState("", document.title, window.location.pathname + window.location.search);
        }
    }, [parser]);


  const value = {
    ...parser, // Includes parsedSpec, isLoading, error, loadSpec, clearSpec
    activeEndpointId,
    setActiveEndpointId,
    activeCategoryId,
    setActiveCategoryId,
    clearSpec: clearSpecAndState, // Override clearSpec with the one that resets state
  };

  return (
    <OpenApiContext.Provider value={value}>
      {children}
    </OpenApiContext.Provider>
  );
};
