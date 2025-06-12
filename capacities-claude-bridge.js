#!/usr/bin/env node

const { EventSource } = require('eventsource');
const readline = require('readline');
const https = require('https');
const { URL } = require('url');

// IMPORTANT: Each user must replace this placeholder with the URL
// they generate from https://mcp-link.vercel.app/ as per the README.
const SSE_URL = 'PASTE_YOUR_GENERATED_MCP_ENDPOINT_URL_HERE';

function log(message) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ${message}`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let state = {
  messageEndpoint: null,
  eventSource: null,
  initialized: false,
};

// This mapping translates client-friendly names (snake_case operationIds from the OpenAPI spec)
// to the names actually registered by the mcp-openapi-to-mcp-adapter
// when "Path Filters" is left empty in mcp-link.vercel.app.
const toolNameMapping = {
  'get_spaces': 'mcplink_capacities_api_get_spaces',
  'get_space_info': 'mcplink_capacities_api_get_space_info',
  'search_content': 'mcplink_capacities_api_post_search',
  'save_weblink': 'mcplink_capacities_api_post_save_weblink',
  'save_to_daily_note': 'mcplink_capacities_api_post_save_to_daily_note'
};

rl.on('line', (line) => {
  log(`RECEIVED: ${line}`);
  let message;
  try {
    message = JSON.parse(line);
    
    if (message.method === 'initialize') {
      const response = {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'capacities-bridge', version: '1.0.0' },
          capabilities: { tools: {} }
        }
      };
      console.log(JSON.stringify(response));
      log(`SENT: ${JSON.stringify(response)}`);
      connectSSE();
    }
    
    else if (message.method === 'initialized' || message.method === 'notifications/initialized') {
      log(`Received ${message.method} from client.`);
    }
    
    else if (message.method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          tools: [
            { name: 'get_space_info', description: 'Get structures and collections of a space', inputSchema: { type: 'object', properties: { searchParams: { type: 'object', properties: { spaceid: { type: 'string', format: 'uuid' } }, required: ['spaceid'] } } } },
            { name: 'get_spaces', description: 'Get your spaces', inputSchema: { type: 'object', properties: {} } },
            { name: 'save_to_daily_note', description: 'Save text to today\'s daily note', inputSchema: { type: 'object', properties: { requestBody: { type: 'object', properties: { spaceId: { type: 'string', format: 'uuid' }, mdText: { type: 'string' }, origin: { type: 'string', enum: ['commandPalette'] }, noTimeStamp: { type: 'boolean' } }, required: ['spaceId', 'mdText'] } } } },
            { name: 'save_weblink', description: 'Save a weblink to a space', inputSchema: { type: 'object', properties: { requestBody: { type: 'object', properties: { spaceId: { type: 'string', format: 'uuid' }, url: { type: 'string', format: 'uri' }, titleOverwrite: { type: 'string' }, descriptionOverwrite: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, mdText: { type: 'string' } }, required: ['spaceId', 'url'] } } } },
            { name: 'search_content', description: 'Search for content', inputSchema: { type: 'object', properties: { requestBody: { type: 'object', properties: { mode: { type: 'string', enum: ['fullText', 'title'] }, searchTerm: { type: 'string' }, spaceIds: { type: 'array', items: { type: 'string', format: 'uuid' } }, filterStructureIds: { type: 'array', items: { type: 'string' } } }, required: ['searchTerm', 'spaceIds'] } } } }
          ]
        }
      };
      console.log(JSON.stringify(response));
      log(`SENT: ${JSON.stringify(response)}`);
    }
    
    else if (message.method === 'resources/list') {
      const response = { jsonrpc: '2.0', id: message.id, result: { resources: [] } };
      console.log(JSON.stringify(response));
      log(`SENT: ${JSON.stringify(response)}`);
    }
    
    else if (message.method === 'prompts/list') {
      const response = { jsonrpc: '2.0', id: message.id, result: { prompts: [] } };
      console.log(JSON.stringify(response));
      log(`SENT: ${JSON.stringify(response)}`);
    }
    
    else if (message.method === 'tools/call') {
      log(`Tool call received for client name: ${message.params.name} with params: ${JSON.stringify(message.params.input)}`);
      handleToolCall(message);
    }
        
    else if (message.method === 'notifications/cancelled') {
      log(`Notification cancelled: ${JSON.stringify(message.params)}`);
    }
    
    else {
      log(`Unknown method: ${message.method}`);
      if (message.id) {
        const response = { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `Method '${message.method}' not found` } };
        console.log(JSON.stringify(response));
        log(`SENT: ${JSON.stringify(response)}`);
      }
    }
    
  } catch (error) {
    log(`Error processing message: ${error.message} on line: ${line}`);
    if (message && message.id) {
        const errorResponse = { jsonrpc: '2.0', id: message.id, error: { code: -32000, message: `Error processing message: ${error.message}` } };
        console.log(JSON.stringify(errorResponse));
        log(`SENT: ${JSON.stringify(errorResponse)}`);
    }
  }
});

function connectSSE() {
  if (!SSE_URL || SSE_URL.includes('PASTE_YOUR_GENERATED')) {
    log('Error: SSE_URL is not configured. Please edit this script and paste the URL generated from https://mcp-link.vercel.app/');
    return;
  }
  log(`Connecting to SSE endpoint: ${SSE_URL}`);
  state.eventSource = new EventSource(SSE_URL);
  state.eventSource.addEventListener('endpoint', (event) => {
    state.messageEndpoint = `https://mcp-openapi-to-mcp-adapter.onrender.com${event.data}`;
    log(`Got message endpoint for RPC calls: ${state.messageEndpoint}`);
  });
  state.eventSource.addEventListener('open', () => { log('SSE connection established'); });
  state.eventSource.addEventListener('error', (error) => { log(`SSE error: ${error.type || 'Unknown error'}`); });
  state.eventSource.addEventListener('message', (event) => { log(`SSE message: ${event.data}`); });
}

async function handleToolCall(originalMessage) {
  let attempts = 0;
  while (!state.messageEndpoint && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  if (!state.messageEndpoint) {
    const response = { jsonrpc: '2.0', id: originalMessage.id, error: { code: -32603, message: 'SSE message endpoint not ready' } };
    console.log(JSON.stringify(response));
    log(`SENT: ${JSON.stringify(response)}`);
    return;
  }

  const clientToolName = originalMessage.params.name; 
  const adapterToolName = toolNameMapping[clientToolName]; 

  if (!adapterToolName) {
    log(`Error: No mapping found for client tool name '${clientToolName}'`);
    const response = { jsonrpc: '2.0', id: originalMessage.id, error: { code: -32602, message: `Tool name '${clientToolName}' not configured in bridge mapping.` } };
    console.log(JSON.stringify(response));
    log(`SENT: ${JSON.stringify(response)}`);
    return;
  }
  
  log(`Transforming client tool name '${clientToolName}' to adapter tool name '${adapterToolName}'`);

  const messageForAdapter = JSON.parse(JSON.stringify(originalMessage));
  messageForAdapter.params.name = adapterToolName;
  
  sendToSSE(messageForAdapter, originalMessage.id);
}

function sendToSSE(messageToSend, originalId) {
  const url = new URL(state.messageEndpoint);
  const postData = JSON.stringify(messageToSend);
  
  log(`Sending to adapter endpoint ${state.messageEndpoint}: ${postData}`);

  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      log(`Adapter response status: ${res.statusCode}, data: ${data}`);
      try {
        const response = JSON.parse(data);
        if (originalId) { response.id = originalId; }
        console.log(JSON.stringify(response));
      } catch (e) {
        log(`Error parsing adapter JSON response: ${e.message}. Raw data: ${data}`);
        if (originalId) {
            const errorResponse = { jsonrpc: '2.0', id: originalId, error: { code: -32603, message: `Invalid response from adapter: ${data}` } };
            console.log(JSON.stringify(errorResponse));
        }
      }
    });
  });

  req.on('error', (error) => {
    log(`Request to adapter error: ${error.message}`);
    if (originalId) {
        const response = { jsonrpc: '2.0', id: originalId, error: { code: -32603, message: `Request to adapter failed: ${error.message}` } };
        console.log(JSON.stringify(response));
    }
  });

  req.write(postData);
  req.end();
}

process.on('exit', () => { if (state.eventSource) { state.eventSource.close(); } log('Debug Capacities MCP Bridge exited'); });
process.stdin.resume();
process.on('uncaughtException', (error) => { log(`Uncaught exception: ${error.message}`); });
process.on('unhandledRejection', (reason) => { log(`Unhandled rejection: ${reason}`); });

log('Capacities MCP Bridge started. Client: snake_case names, Adapter: mcplink_... names.');
log('Waiting for stdio input from MCP client (e.g., Claude Desktop)...');