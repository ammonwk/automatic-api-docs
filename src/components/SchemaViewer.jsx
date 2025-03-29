import React, { useState } from 'react';

// Basic Schema Viewer - Can be significantly enhanced
function SchemaViewer({ schema, spec, isRoot = false, indentLevel = 0 }) {
    const [isExpanded, setIsExpanded] = useState(isRoot || indentLevel < 1); // Expand root or first level by default

    if (!schema) {
        return <span className="text-muted fst-italic">No schema</span>;
    }

    // Basic $ref resolution (should ideally be handled during transformation)
    if (schema.$ref && spec) {
        const refPath = schema.$ref.substring(2).split('/');
        let resolvedSchema = spec;
        try {
            for (const key of refPath) {
                resolvedSchema = resolvedSchema[key];
            }
            schema = resolvedSchema || schema; // Use resolved schema or stick with original ref if not found
        } catch (e) {
            console.warn(`Could not resolve $ref: ${schema.$ref}`);
            // Stick with the original schema which just contains the $ref
        }
    }

    const toggleExpand = (e) => {
        e.stopPropagation(); // Prevent parent toggles
        setIsExpanded(!isExpanded);
    };

    const indentStyle = { paddingLeft: `${indentLevel * 15}px` };
    const hasNestedProperties = schema.type === 'object' && schema.properties && Object.keys(schema.properties).length > 0;
    const isArrayWithItems = schema.type === 'array' && schema.items;

    const renderSchemaType = () => {
        let typeString = schema.type || 'any';
        if (schema.format) {
            typeString += ` (${schema.format})`;
        }
        if (schema.enum) {
            typeString += ` [${schema.enum.join(', ')}]`;
        }
        if (schema.default) {
             typeString += ` (default: ${JSON.stringify(schema.default)})`;
        }
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
            {schema.description && <span className="schema-description text-muted ms-2">- {schema.description}</span>}
            {schema.deprecated && <span className="badge bg-warning text-dark ms-2">Deprecated</span>}
            {schema.readOnly && <span className="badge bg-info text-dark ms-2">Read Only</span>}
            {schema.writeOnly && <span className="badge bg-info text-dark ms-2">Write Only</span>}
            {schema.$ref && <span className="schema-ref text-muted ms-2">(ref: {schema.$ref})</span>}


            {isExpanded && (
                <div className="schema-details mt-1">
                    {schema.type === 'object' && schema.properties && (
                        <div className="schema-properties">
                            {Object.entries(schema.properties).map(([propName, propSchema]) => (
                                <div key={propName} className="schema-property">
                                    <strong className="schema-prop-name">{propName}</strong>
                                    {schema.required?.includes(propName) && <span className="param-required ms-1">*</span>}
                                    <SchemaViewer schema={propSchema} spec={spec} indentLevel={indentLevel + 1} />
                                </div>
                            ))}
                        </div>
                    )}
                    {schema.type === 'array' && schema.items && (
                         <div className="schema-array-items">
                            <strong>Items:</strong>
                            <SchemaViewer schema={schema.items} spec={spec} indentLevel={indentLevel + 1} />
                         </div>
                    )}
                    {/* Add more details like examples, constraints (minLength, etc.) here */}
                     {schema.example && <div className="schema-example text-muted">Example: <code>{JSON.stringify(schema.example)}</code></div>}

                </div>
            )}
        </div>
    );
}

export default SchemaViewer;
