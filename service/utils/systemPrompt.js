// service/utils/systemPrompt.js
const fs = require('fs').promises;
const path = require('path');

// Load API data from JSON file
const loadApiData = async () => {
  const apiDataPath = path.join(__dirname, '../data/apiData.json');
  const data = await fs.readFile(apiDataPath, 'utf8');
  return JSON.parse(data);
};

exports.getSystemPrompt = async () => {
  const apiData = await loadApiData();
  const categories = apiData.paths ? extractCategories(apiData) : {};
  
  // Extract all endpoint prefixes for context
  const allPrefixes = [];
  Object.values(categories).forEach(category => {
    category.prefixes.forEach(prefix => {
      allPrefixes.push(prefix);
    });
  });
  
  return `You are an API Assistant. Your goal is to help users understand the API and generate code examples for their specific use cases.

AVAILABLE ENDPOINT PREFIXES:
${allPrefixes.join(', ')}

IMPORTANT GUIDELINES:
1. Read the situation, pay close attention to the user's query, and provide a response that is helpful and relevant.
2. Include proper authentication in code examples: an Authorization header of "Bearer API_KEY".
3. Provide explanations alongside your code examples.
4. IMPORTANT: Use the search_endpoints tool to find relevant endpoints before providing code examples.
5. Explain rate limits (3000 requests per minute, search endpoints return max 50,000 IDs, and get endpoints return max 1,000 entities) and key grouping information when relevant.
6. If the user doesn't specify a language, use JavaScript as the default.
7. As soon as you have enough information, provide your final response. Do not try to use a tool on that last response, or it will result in an error and the user won't see your work.

SEARCH APPROACH:
1. When searching for endpoints, try again with different search terms if your first attempt doesn't yield useful results.
2. Always show your thinking process using <thinking> tags to explain what you're searching for, the user will see those.

You have access to tools that allow you to search the API documentation. Use them to provide accurate information.

When writing code examples:
- For JavaScript: Use modern JS with Promises
- For Python: Use the requests library
- For cURL: Include proper headers and parameters`;
};

// Helper to extract categories from Swagger data
function extractCategories(swaggerData) {
  return {
    'Customer Management': {
      icon: 'fa-users',
      prefixes: ['/customer', '/additionalContact', '/customerSource', '/customerFlag', '/compassCustomer', '/review']
    },
    'Employee Management': {
      icon: 'fa-user-tie',
      prefixes: ['/employee', '/employeeLocation', '/timeClock', '/timeClockCategory', '/license', '/accessControl', '/team', '/skill']
    },
    'Service Planning': {
      icon: 'fa-clipboard-list',
      prefixes: ['/servicePlan', '/servicePlanRound', '/serviceType', '/subscription', '/product', '/applicationMethod']
    },
    'Appointment & Scheduling': {
      icon: 'fa-calendar-alt',
      prefixes: ['/appointment', '/appointmentReminder', '/appointmentCancellationReason', '/appointmentRescheduleReason', '/onMyWayNotification', '/reserviceReason', '/cancellationReason']
    },
    'Route Management': {
      icon: 'fa-route',
      prefixes: ['/route', '/routeTemplate', '/spot', '/knock']
    },
    'Financial Operations': {
      icon: 'fa-dollar-sign',
      prefixes: ['/payment', '/paymentProfile', '/paymentPriority', '/appliedPayment', '/chargeback', '/disbursement', '/disbursementItem', '/collectionStage', '/glAccount']
    },
    'Ticket & Task Management': {
      icon: 'fa-tasks',
      prefixes: ['/ticket', '/ticketItem', '/task']
    },
    'Document Management': {
      icon: 'fa-file-alt',
      prefixes: ['/document', '/contract', '/form', '/note']
    },
    'Location Management': {
      icon: 'fa-map-marker-alt',
      prefixes: ['/location', '/region', '/office', '/door', '/unit']
    },
    'Pest Control Specific': {
      icon: 'fa-bug',
      prefixes: ['/chemical', '/chemicalUse', '/insect', '/diagram']
    },
    'System & Utilities': {
      icon: 'fa-cogs',
      prefixes: ['/dataLink', '/genericFlag', '/genericFlagAssignment', '/group', '/changelog']
    }
  };
}