# hevy-mcp: Model Context Protocol Server for Hevy Fitness API

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build and Test](https://github.com/chrisdoc/hevy-mcp/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/chrisdoc/hevy-mcp/actions/workflows/build-and-test.yml)
[![Codecov](https://codecov.io/gh/chrisdoc/hevy-mcp/branch/main/graph/badge.svg)](https://codecov.io/gh/chrisdoc/hevy-mcp)
[![npm version](https://img.shields.io/npm/v/hevy-mcp.svg)](https://www.npmjs.com/package/hevy-mcp)

A Model Context Protocol (MCP) server implementation that interfaces with the [Hevy fitness tracking app](https://www.hevyapp.com/) and its [API](https://api.hevyapp.com/docs/). This server enables AI assistants like **Claude Desktop** and **Cursor** to access and manage workout data, routines, and exercise templates through the Hevy API (requires PRO subscription).

---

## 📋 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Claude Desktop Configuration](#claude-desktop-configuration)
  - [Cursor Configuration](#cursor-configuration)
  - [Other MCP Clients (via add-mcp)](#other-mcp-clients-via-add-mcp)
- [Why hevy-mcp?](#why-hevy-mcp)
- [Configuration](#configuration)
- [Available MCP Tools](#available-mcp-tools)
- [Development & Contributing](#development--contributing)

---

## 🚀 Features

- **Workout Management**: Fetch, create, and update workouts.
- **Routine Management**: Access and manage workout routines.
- **Exercise Templates**: Browse available exercise templates with in-memory caching.
- **Folder Organization**: Manage routine folders.
- **Webhook Subscriptions**: Create, view, and delete webhook subscriptions for workout events.

---

## 🏁 Quick Start

Pick the workflow that fits your setup:

| Scenario              | Command                                     | Requirements               |
| :-------------------- | :------------------------------------------ | :------------------------- |
| **One-off stdio run** | `HEVY_API_KEY=sk_live... npx -y hevy-mcp`   | Node.js ≥ 26, Hevy API key |
| **Local development** | `npm install && npm run build && npm start` | `.env` with `HEVY_API_KEY` |

---

## 🛠️ Prerequisites

- **Node.js**: v26 or higher (strongly recommended to use the exact version pinned in `.nvmrc`).
- **npm**: v10 or higher.
- **Hevy API key**: Required for all operations (available with Hevy PRO).

---

## 📦 Installation

### Run via npx (Recommended)

You can launch the server directly without cloning:

```bash
HEVY_API_KEY=your_hevy_api_key_here npx -y hevy-mcp
```

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/chrisdoc/hevy-mcp.git
cd hevy-mcp

# Install dependencies
npm install

# Create .env and add your keys
cp .env.sample .env
# Edit .env and add your HEVY_API_KEY
```

---

## 🔗 Integration

### Claude Desktop Configuration

To use this server with Claude Desktop, add the following to your `claude_desktop_config.json`:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
	"mcpServers": {
		"hevy-mcp": {
			"command": "npx",
			"args": ["-y", "hevy-mcp"],
			"env": {
				"HEVY_API_KEY": "sk_live_your_key_here"
			}
		}
	}
}
```

### Cursor Configuration

Add this server under `"mcpServers"` in `~/.cursor/mcp.json`:

```json
{
	"mcpServers": {
		"hevy-mcp": {
			"command": "npx",
			"args": ["-y", "hevy-mcp"],
			"env": {
				"HEVY_API_KEY": "your-api-key-here"
			}
		}
	}
}
```

### Other MCP Clients (via add-mcp)

For a generic setup flow across MCP clients, use [`add-mcp`](https://github.com/neon-solutions/add-mcp):

```bash
npx add-mcp hevy-mcp --env "HEVY_API_KEY=secret"
```

This bootstraps the `hevy-mcp` entry in your client config without manual JSON edits.

---

<a id="smithery-remote"></a>

## ☁️ Remote Deployment (use from Claude on your phone) via Smithery

The published npm package runs over **stdio**, which only works for desktop clients that can spawn a local process (Claude Desktop, Cursor). **Claude's mobile app can only talk to _remote_ MCP servers** added as a **custom connector** on [claude.ai](https://claude.ai) (these sync to the phone). To bridge that gap, this repo ships a [Smithery](https://smithery.ai) deployment that hosts the exact same server remotely over **Streamable HTTP** — Smithery also provides the public HTTPS endpoint and the OAuth flow Claude requires, so you never put your API key in a URL.

This works because `src/index.ts` exports the Smithery TypeScript-runtime contract (`export const configSchema` + a default `createServer({ config })` returning the low-level `Server`), and [`smithery.yaml`](./smithery.yaml) selects `runtime: typescript`.

### 1. Deploy on Smithery

1. Push this repository to your own GitHub account (fork it).
2. Sign in to [smithery.ai](https://smithery.ai) with GitHub and **add/deploy a server** from your fork. Smithery detects `smithery.yaml`, builds the TypeScript runtime, and hosts it over Streamable HTTP.
3. When prompted for configuration, set **`apiKey`** to your Hevy API key (from the Hevy app → Settings → API). Smithery stores this and passes it per-connection — it is **not** baked into the build.
4. Smithery gives you a hosted **MCP server URL** plus a "Connect" panel.

### 2. Add it to Claude (then use it on your phone)

1. On **[claude.ai](https://claude.ai) → Settings → Connectors → Add custom connector**, paste the Smithery MCP URL (or use Smithery's "Connect → Claude" shortcut) and complete the OAuth/authentication prompt.
2. Open the **Claude mobile app** — connectors added on claude.ai automatically sync, so `hevy-mcp` is now available on your phone.

> **Requirements & notes**
>
> - Custom connectors require a paid Claude plan (Pro, Max, Team, or Enterprise).
> - A Hevy **PRO** subscription is required for API access.
> - This build keeps the upstream **Sentry** instrumentation (and its DSN). Pseudonymous usage telemetry from your deployment flows to the upstream project's Sentry; the raw API key is never sent.

### 3. (Optional) Test the remote build locally

```bash
# Produce the Streamable HTTP bundle at .smithery/index.cjs
npm run smithery:build
PORT=9099 node .smithery/index.cjs      # serves MCP at http://localhost:9099/mcp

# …or run the interactive Smithery playground (opens in your browser)
npm run smithery:dev
```

The local scripts pin the Smithery build CLI (`@smithery/cli@1.2.4`) because the `@smithery/cli` package name now resolves to an unrelated client CLI on its `latest` tag.

---

## ✨ Why hevy-mcp?

- 🚀 **High Performance**: Built with the **Oxc** toolchain (`oxlint`/`oxfmt`) for near-instant linting and formatting.
- 🛡️ **Type Safety**: Fully type-safe implementation using **Zod** and **Kubb**-generated API clients.
- 📉 **Observability**: Built-in **Sentry** monitoring for error tracking, lifecycle and tool tracing, and stdio parse diagnostics.
- ⚡ **Optimized**: Includes in-memory caching for exercise templates to reduce API latency.

---

## ⚙️ Configuration

Supply your Hevy API key via:

1. **Environment Variable**: `HEVY_API_KEY` (in `.env` or system environment).
2. **CLI Argument**: `--hevy-api-key=your_key` (after `--` in npm scripts).

```env
# Example .env
HEVY_API_KEY=your_hevy_api_key_here
```

### 📡 Sentry Monitoring

`hevy-mcp` includes Sentry monitoring to observe errors and usage in production. It initializes `@sentry/node` with tracing enabled and PII collection disabled by default. Recent observability changes also add:

- lifecycle spans around server build, run, and stdio connect
- per-tool execution spans plus captured handler exceptions
- stdio parse diagnostics, including leading UTF-8 BOM stripping and invalid JSON context
- a deterministic pseudonymous Sentry user ID derived from `HEVY_API_KEY`, so the raw key is never sent to Sentry

---

<details>
<summary><strong>⚠️ Deprecation Notices (HTTP/SSE & Docker)</strong></summary>

### Stdio Only

As of version **1.18.0**, the `hevy-mcp` **npm package** only supports **stdio** transport. HTTP/SSE transport was removed from the package to simplify the codebase and focus on the native MCP experience. For **remote** access (e.g. Claude mobile), deploy via Smithery instead — see [Remote Deployment via Smithery](#smithery-remote), which hosts the same server over Streamable HTTP without re-introducing an HTTP server into the package.

### Docker

Docker-based workflows are retired. The provided `Dockerfile` now exits with a message pointing to the stdio-native experience. Legacy GHCR images are no longer updated.

</details>

---

## 🛠️ Available MCP Tools

| Category              | Tools                                                                                                                              |
| :-------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| **Workouts**          | `get-workouts`, `get-workout`, `create-workout`, `update-workout`, `get-workout-count`, `get-workout-events`                       |
| **Routines**          | `get-routines`, `get-routine`, `create-routine`, `update-routine`                                                                  |
| **Templates**         | `get-exercise-templates`, `get-exercise-template`, `search-exercise-templates`, `create-exercise-template`, `get-exercise-history` |
| **Folders**           | `get-routine-folders`, `get-routine-folder`, `create-routine-folder`                                                               |
| **Body Measurements** | `get-body-measurements`, `get-body-measurement`, `create-body-measurement`, `update-body-measurement`                              |
| **User**              | `get-user-info`                                                                                                                    |
| **Webhooks**          | `get-webhook-subscription`, `create-webhook-subscription`, `delete-webhook-subscription`                                           |

---

## 👨‍💻 Development & Contributing

### Quick Commands

- **Build**: `npm run build`
- **Lint/Format**: `npm run check` (uses oxlint/oxfmt)
- **Unit Tests**: `npx vitest run --exclude tests/integration/**`
- **Full Test Suite**: `npm test` (requires `HEVY_API_KEY`)

For a detailed senior engineer guide, please refer to [AGENTS.md](./AGENTS.md).

### API Client Generation

The API client is automatically generated from the OpenAPI spec using [Kubb](https://kubb.dev/):

```bash
npm run build:client
```

---

## 📄 License & Acknowledgements

- **License**: [MIT](./LICENSE)
- **Credits**: [Model Context Protocol](https://github.com/modelcontextprotocol), [Hevy Fitness](https://www.hevyapp.com/).

---

**Contributions are welcome!** Please open an issue or PR for any major changes.
