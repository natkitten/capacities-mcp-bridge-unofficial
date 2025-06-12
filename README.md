<div style="text-align:center">

![Banner showing pixel-art CRT cat and title “Capacities.io Unofficial MCP”](assets/natkitten_capacities_vibe_coded.png)

# Unofficial Capacities.io MCP Tools

[![Vibe Coded](https://img.shields.io/badge/Vibe--Coded_With-Gemini_2.5_Pro-blueviolet?style=for-the-badge&logo=google-gemini)](https://gemini.google.com/)

</div>

## Disclaimer

This project provides several methods for connecting to the [Capacities](https://capacities.io/) note taking app API using the Model Context Protocol (MCP). It was **100% vibe-coded** with the help of Gemini 2.5 Pro. While it works, it relies on third-party adapter services and, in some cases, your own hosting. Use at your own risk.

For everyone looking for a native Bun implementation, there exists another project https://github.com/jem-computer/capacities-mcp

---

## Table of Contents

1.  [**Setup for Claude Desktop (with Node.js Bridge)**](#setup-1-claude-desktop-with-nodejs-bridge)
    *   *Use this if you need to connect Claude Desktop and it requires simple tool names.*
2.  [**Setup for Simple SSE Clients (CLion, VS Code)**](#setup-2-simple-sse-for-ides-clion-vs-code)
    *   *Use this for a direct connection from a compatible IDE plugin.*
3.  [**Advanced Setup for Genspark (Self-Hosted Server)**](#setup-3-advanced-self-hosted-server-for-genspark)
    *   *The most reliable and robust method. Use this for Genspark or any other client if you have your own server/VPS.*

---

## General Prerequisites

*   A **Capacities API Token**. You can generate this from your Capacities account settings if you have a paid account.
*   The **MCP Link Generator** tool: [**https://mcp-link.vercel.app/**](https://mcp-link.vercel.app/)

---

## Setup 1: Claude Desktop (with Node.js Bridge)

This method uses the included `capacities-claude-bridge.js` script to act as a translator between Claude Desktop (which needs simple tool names) and the MCP adapter (which creates complex names).

### Step 1.1: Install Node.js and Download Files

1.  **Install Node.js:** Go to the official [Node.js website](https://nodejs.org/) and download and install the LTS version for your operating system.

2.  **Download the Bridge Code:** Open a terminal (like Git Bash, Command Prompt, or PowerShell) and run the following commands:
    ```bash
    # Clone the repository to a permanent location
    git clone https://github.com/natkitten/capacities-mcp-bridge-unofficial.git
    
    # Navigate into the project folder
    cd capacities-mcp-bridge-unofficial
    ```

3.  **Install Dependencies:** While inside the `capacities-mcp-bridge-unofficial` folder, run:
    ```bash
    npm install
    ```

### Step 1.2: Generate the Server URL for the Bridge

1.  Go to [**mcp-link.vercel.app**](https://mcp-link.vercel.app/).
2.  Fill in the form:
    *   **OpenAPI Specification URL:**
        Use this specific URL for the Claude bridge setup. It uses snake_case `operationId`s.
        ```
        https://gist.githubusercontent.com/natkitten/e6ce1335c2cdad87a9237156c5cda315/raw/capacities_openapi_2.json
        ```
    *   **API Base URL:** `https://api.capacities.io`
    *   **HTTP Headers:** Enter your Authorization header:
        ```
        Authorization: Bearer YOUR_CAPACITIES_API_TOKEN
        ```
    *   **Path Filters:** **Leave this field completely empty.**
    *   **Encoding Options:** Select **"Base64 (JSON Encoded)"**.
3.  Click "Generate MCP Link" and copy the resulting URL.

### Step 1.3: Configure the Bridge Script

1.  Open the `capacities-claude-bridge.js` file (located in the folder you just downloaded) in a text editor.
2.  Paste the URL you just copied, replacing the placeholder text for the `SSE_URL` constant.
    ```javascript
    const SSE_URL = 'https://mcp-openapi-to-mcp-adapter.onrender.com/sse?code=...'; // YOUR URL HERE
    ```
3.  Save the file.

### Step 1.4: Configure Claude Desktop (Windows)

1.  Open File Explorer and navigate to your Claude Desktop config file by pasting this path into the address bar:
    `%APPDATA%\Claude Desktop\claude_desktop_config.json`
2.  Open the file and add the `mcp_bridges` section as shown below.
    ```json
    {
      "mcpServers": {
        "capacities": {
          "command": "node",
          "args": ["C:\\path\\to\\your\\capacities-mcp-bridge-unofficial\\capacities-claude-bridge.js"]
        }
      }
    }
    ```
    **CRUCIAL:** Replace `C:\\path\\to\\your\\capacities-mcp-bridge-unofficial` with the actual, absolute path to the folder where you cloned the repository. Remember to use double backslashes `\\`.
3.  Save the `claude_desktop_config.json` file and restart Claude Desktop.

---

## Setup 2: Simple SSE for IDEs (Cline/RooCode in VS Code)

This method is for MCP plugins that can handle the `mcplink_...` tool names directly. No bridge script is needed.

1.  Follow **Step 1.2** above to generate your unique Server URL from `mcp-link.vercel.app`, using the `capacities_openapi_2.json` and leaving **"Path Filters" empty**.
2.  Find the MCP configuration file for your IDE. It's often located at `YOUR_HOME_DIRECTORY/.mcp/servers.json`.
3.  Add the following entry, replacing the placeholder with your generated URL:
    ```json
    {
      "servers": {
        "capacities": {
          "url": "PASTE_YOUR_GENERATED_URL_HERE"
        }
      }
    }
    ```
4.  Restart your IDE. The tools should appear with their full `mcplink_...` names.

---

## Setup 3: Advanced Self-Hosted Server for Genspark

This is the most reliable method. It runs the MCP server on your own VPS. This setup requires a slightly different OpenAPI spec to work around a parser bug in the self-hosted server package.

### Step 3.1: VPS and Node.js Setup

1.  **Connect to your VPS** via SSH (`ssh root@YOUR_VPS_IP`).
2.  **Install `nvm` (Node Version Manager):**
    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    ```
3.  **Activate `nvm`:**
    ```bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    ```
4.  **Add `nvm` to your shell profile** so it loads automatically on every login:
    ```bash
    echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
    echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
    ```
5.  **Install Node.js (LTS version):**
    ```bash
    nvm install --lts
    ```

### Step 3.2: Create and Configure the Server

1.  **Create a project directory** on your VPS and navigate into it:
    ```bash
    mkdir capacities-mcp-server
    cd capacities-mcp-server
    ```
2.  **Initialize a Node.js project:** This creates the `package.json` file.
    ```bash
    npm init -y
    ```
3.  **Set the project type to "module":** Open the `package.json` with `nano package.json` and add `"type": "module",` after the `"main": "index.js",` line.
4.  **Install `pm2` and the server package locally:** We install them here to keep the project self-contained.
    ```bash
    npm install pm2 @ivotoby/openapi-mcp-server
    ```

### Step 3.3: Create the Server Configuration

1.  **Create an `ecosystem.config.cjs` file** for `pm2`. The `.cjs` extension is important.
    ```bash
    nano ecosystem.config.cjs
    ```
2.  **Paste the following configuration** into the file. This uses the locally installed `pm2` and server script.

    ```javascript
    module.exports = {
      apps : [{
        name   : 'capacities-mcp',
        script : './node_modules/@ivotoby/openapi-mcp-server/dist/cli.js',
        args   : [
          '--openapi-spec',
          'https://gist.githubusercontent.com/natkitten/37e88b5dab4195b0f4d650f31f5505bf/raw/capacities_openapi_3.json',
          '--api-base-url',
          'https://api.capacities.io',
          '--headers',
          'Authorization:Bearer YOUR_CAPACITIES_API_TOKEN',
          '--toolNameFormat',
          '**',
          '--transport',
          'http',
          '--host',
          '0.0.0.0',
          '--port',
          '8448' // Or your preferred port
        ]
      }]
    }
    ```
    **Replace `YOUR_CAPACITIES_API_TOKEN`** with your actual token.
3.  Save and exit (`CTRL + X`, `Y`, `Enter`).

### Step 3.4: Run the Server

1.  **Start the server using the local `pm2`:**
    ```bash
    ./node_modules/pm2/bin/pm2 start ecosystem.config.cjs
    ```
2.  **Check logs** to confirm it's listening on your port: `pm2 logs capacities-mcp`
3.  **Save the configuration** for reboots: `pm2 save`
4.  **Enable `pm2` on startup:** Run `pm2 startup` and follow the on-screen instructions.

### Step 3.5: Configure Firewall, Caddy, and Genspark

1.  **Firewall:** Open your chosen port (`8448` in this example) on both your VPS firewall (`sudo ufw allow 8448`) and your cloud provider's firewall (in the Hostinger dashboard).
2.  **Caddy:** For a secure HTTPS URL, set up a reverse proxy in your `Caddyfile`.
    ```Caddyfile
    mcp.yourdomain.com {
        reverse_proxy localhost:8448
    }
    ```
    Reload Caddy to apply the changes (`sudo systemctl reload caddy`).
3.  **Genspark:**
    *   **Server Type:** `StreamableHttp`
    *   **Server URL:** `https://mcp.yourdomain.com/mcp` (using the `/mcp` path).
    *   **Request Header:**
        ```json
        {"Content-Type": "application/json"}
        ```
4.  Add the server and test it.

---

Licensed under the MIT License — see [LICENSE](LICENSE) for details