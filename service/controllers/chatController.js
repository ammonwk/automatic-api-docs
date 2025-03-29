// service/controllers/chatController.js
const { getSystemPrompt } = require('../utils/systemPrompt');
const { tools } = require('../utils/toolDefinitions');
const { runTool } = require('../utils/toolExecutor');
const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Track conversations
const conversations = {};

exports.chat = async (req, res) => {
  try {
    // Determine if this is an SSE request (GET) or regular request (POST)
    const isSSE = req.method === 'GET';
    let message, conversationId;
    
    if (isSSE) {
      // For GET requests (SSE), get params from query string
      message = req.query.message;
      conversationId = req.query.conversationId;
      
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
    } else {
      // For POST requests, get params from body
      message = req.body.message;
      conversationId = req.body.conversationId;
    }
    
    // Get or create conversation
    if (!conversations[conversationId]) {
      conversations[conversationId] = {
        messages: [],
        systemPrompt: await getSystemPrompt()
      };
    }
    
    const conversation = conversations[conversationId];
    
    // Add user message
    conversation.messages.push({
      role: 'user',
      content: message
    });
    
    // Function to send progress updates
    const sendUpdate = (type, content) => {
      if (isSSE) {
        res.write(`data: ${JSON.stringify({ type, content })}\n\n`);
      }
    };
    
    // Initial response to let user know we're working
    sendUpdate('thinking', 'Searching for relevant information...');
    
    // Multi-turn tool use - keep iterating until Claude doesn't request a tool
    let isToolUseRequired = true;
    let finalResponse;
    let toolCounter = 0;
    
    while (isToolUseRequired && toolCounter < 5) { // Max 5 tool uses to prevent infinite loops
      toolCounter++;
      
      // Send to Claude
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        system: conversation.systemPrompt,
        messages: conversation.messages,
        max_tokens: 3000,
        tools: tools,
        tool_choice: { type: "auto" }
      });
      
      const assistantMessage = response.content;
      
      // Check if Claude wants to use a tool
      if (response.stop_reason === 'tool_use') {
        // Extract the tool use
        const toolUse = assistantMessage.find(block => block.type === 'tool_use');
        
        // Extract thinking blocks if present
        const thinkingBlocks = assistantMessage
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');

        // Only send thinking content that's within <thinking> tags
        if (thinkingBlocks) {
        const thinkingContent = extractThinkingContent(thinkingBlocks);
        if (thinkingContent) {
            sendUpdate('thinking', thinkingContent);
        }
        }
        
        // Show tool being used
        sendUpdate('searching', toolUse.input.query || 'more information...');
        
        // Execute the tool
        try {
          const toolResult = await runTool(toolUse.name, toolUse.input);
          
          // Show tool result
          sendUpdate('results_received', toolUse.input.query || 'your search');
          
          // Add tool use to conversation
          conversation.messages.push({
            role: 'assistant',
            content: assistantMessage
          });
          
          // Add tool result to conversation
          conversation.messages.push({
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: toolResult,
            }]
          });
          
          // Continue the loop to check if Claude wants to use another tool
          isToolUseRequired = true;
          
        } catch (error) {
          console.error('Tool execution error:', error);
          sendUpdate('error', `Error executing tool: ${error.message}`);
          
          // Stop the loop on error
          isToolUseRequired = false;
          
          if (isSSE) {
            res.end();
          } else {
            res.status(500).json({ error: `Tool execution failed: ${error.message}` });
          }
          return;
        }
      } else {
        // Claude has finished using tools and provided a final response
        isToolUseRequired = false;
        finalResponse = response;
        
        // Add the final assistant message to conversation
        conversation.messages.push({
          role: 'assistant',
          content: assistantMessage
        });
        
        if (isSSE) {
          sendUpdate('final', assistantMessage);
          res.end();
        } else {
          res.json({
            messageId: response.id,
            response: assistantMessage,
            conversationId
          });
        }
      }
    }
    
    // If we reached the tool use limit, get a final response from Claude
    if (isToolUseRequired) {
      sendUpdate('thinking', 'Finalizing response after multiple searches...');
      
      const limitResponse = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        system: conversation.systemPrompt + "\n\nPlease provide a final answer now using the information you've gathered from the tools so far.",
        messages: conversation.messages,
        max_tokens: 3000,
        tool_choice: { type: "none" }  // Force Claude to respond without tools
      });
      
      // Add the final assistant message to conversation
      conversation.messages.push({
        role: 'assistant',
        content: limitResponse.content
      });
      
      if (isSSE) {
        sendUpdate('final', limitResponse.content);
        res.end();
      } else {
        res.json({
          messageId: limitResponse.id,
          response: limitResponse.content,
          conversationId
        });
      }
    }
    
  } catch (error) {
    console.error('Chat error:', error);
    
    if (req.method === 'GET' && res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', content: 'Failed to process chat request' })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: 'Failed to process chat request' });
    }
  }
};

function extractThinkingContent(text) {
    const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/g;
    let matches = [];
    let match;
    
    while ((match = thinkingRegex.exec(text)) !== null) {
      matches.push(match[1].trim());
    }
    
    return matches.join('\n\n');
  }
  