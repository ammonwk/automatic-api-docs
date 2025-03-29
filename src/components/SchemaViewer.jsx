import React, { useState } from 'react';
import { highlightSearchTerm } from '../utils/helpers'; // Import helper

// Add searchTerm to props
function SchemaViewer({ schema, spec, isRoot = false, indentLevel = 0, searchTerm }) {
    const [isExpanded, setIsExpanded] = useState(isRoot || indentLevel < 1);

    // Helper to render highlighted text or plain text
    const renderHighlighted = (text, defaultWrapper = 'span') => {
        if (!text) return null;
        if (searchTerm) {
            // Use dangerouslySetInnerHTML for the wrapper element
            const Tag = defaultWrapper;
            return <Tag dangerouslySetInnerHTML={{ __html: highlightSearchTerm(text, searchTerm) }} />;
        } else {
            // Render plain text without extra wrapper if possible, or use default
            return text;
        }
    };

    // --- Handle $ref resolution ---
    // IMPORTANT: This basic resolution might fail for complex cases.
    // It's STRONGLY recommended to resolve *all* refs during the initial
    // parsing/transformation step in useOpenApiParser.js for reliability.
    let resolvedSchema = schema; // Start with the passed schema
    if (schema?.$ref && spec) {
        const refPath = schema.$ref.substring(2).split('/');
        let current = spec;
        try {
            for (const key of refPath) {
                current = current?.[key];
            }
            resolvedSchema = current || schema; // Use resolved or fallback to original ref
        } catch (e) {
            console.warn(`SchemaViewer: Could not resolve $ref: ${schema.$ref}`);
            resolvedSchema = schema; // Keep original ref object on error
        }
    }
    // Use resolvedSchema from now on
    // -----------------------------

     if (!resolvedSchema) {
         return <span className="text-muted fst-italic">No schema</span>;
     }


    const toggleExpand = (e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const indentStyle = { paddingLeft: `${indentLevel * 15}px` };
    const hasNestedProperties = resolvedSchema.type === 'object' && resolvedSchema.properties && Object.keys(resolvedSchema.properties).length > 0;
    const isArrayWithItems = resolvedSchema.type === 'array' && resolvedSchema.items;

    const renderSchemaType = () => {
        let typeString = resolvedSchema.type || 'any';
        if (resolvedSchema.format) typeString += ` (${resolvedSchema.format})`;
        // Highlight enum values
        if (resolvedSchema.enum) typeString += ` [${resolvedSchema.enum.map(e => renderHighlighted(String(e))).join(', ')}]`;
        if (resolvedSchema.default !== undefined) typeString += ` (default: ${JSON.stringify(resolvedSchema.default)})`;
        // Type string itself is unlikely to be highlighted, but parts (enum) can be.
        // Using React elements within the string requires careful construction or splitting.
        // Simple approach: Don't highlight the type string itself for now.
        return <code className="schema-type">{typeString}</code>;
    };

    return (
        <div className={`schema-viewer level-${indentLevel}`} style={indentStyle}>
            {(hasNestedProperties || isArrayWithItems) && (
                <button onClick={toggleExpand} className="schema-toggle-btn me-1">
                    <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                </button>
            )}
            {renderSchemaType()}
            {/* Highlight Description */}
            {resolvedSchema.description && <span className="schema-description text-muted ms-2">{renderHighlighted(`- ${resolvedSchema.description}`)}</span>}
            {/* Other badges/info */}
            {schema.deprecated && <span className="badge bg-warning text-dark ms-2">Deprecated</span>}
            {schema.readOnly && <span className="badge bg-info text-dark ms-2">Read Only</span>}
            {schema.writeOnly && <span className="badge bg-info text-dark ms-2">Write Only</span>}
            {resolvedSchema.$ref && !Object.is(resolvedSchema, schema) && <span className="schema-ref text-muted ms-2">(resolved ref: {schema.$ref})</span>}


            {isExpanded && (
                <div className="schema-details mt-1">
                    {resolvedSchema.type === 'object' && resolvedSchema.properties && (
                        <div className="schema-properties">
                            {Object.entries(resolvedSchema.properties).map(([propName, propSchema]) => (
                                <div key={propName} className="schema-property">
                                    {/* Highlight Property Name */}
                                    <strong className="schema-prop-name">{renderHighlighted(propName)}</strong>
                                    {resolvedSchema.required?.includes(propName) && <span className="param-required ms-1">*</span>}
                                    {/* Pass searchTerm recursively */}
                                    <SchemaViewer schema={propSchema} spec={spec} indentLevel={indentLevel + 1} searchTerm={searchTerm} />
                                </div>
                            ))}
                        </div>
                    )}
                    {resolvedSchema.type === 'array' && resolvedSchema.items && (
                         <div className="schema-array-items">
                            <strong>Items:</strong>
                            {/* Pass searchTerm recursively */}
                            <SchemaViewer schema={resolvedSchema.items} spec={spec} indentLevel={indentLevel + 1} searchTerm={searchTerm} />
                         </div>
                    )}
                    {/* Highlight Example (if it's a string) */}
                     {resolvedSchema.example && <div className="schema-example text-muted">Example: <code>{typeof resolvedSchema.example === 'string' ? renderHighlighted(resolvedSchema.example) : JSON.stringify(resolvedSchema.example)}</code></div>}
                </div>
            )}
        </div>
    );
}

export default SchemaViewer;