// service/utils/toolDefinitions.js
exports.tools = [
    {
      name: "search_documentation",
      description: `Search the API documentation for relevant endpoints, their details, and code examples.
      This tool allows you to find API endpoints based on keywords, get their full details, and see code examples in different programming languages.
      Use this tool whenever you need to find information about how to perform a specific operation with the API.`,
      input_schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search term or operation (e.g., 'create customer', 'search appointments')"
          },
          language: {
            type: "string",
            description: "Optional. The programming language for code examples. Default is javascript if not specified.",
            enum: ["javascript", "javascript_apimodule", "python", "curl"]
          }
        },
        required: ["query"]
      }
    }
  ];