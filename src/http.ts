import { createServer as createHttpServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import createMcpServer from "./index.js";

// Standalone Streamable HTTP entry point used for remote deployments (e.g.
// Azure Container Apps) so the server can be reached by remote MCP clients such
// as Claude on mobile. The stdio entry point (cli.ts) is unchanged.
//
// Auth model for personal hosting:
// - The Hevy API key is read from the HEVY_API_KEY environment variable, so it
//   is never placed in a URL or sent by the client.
// - The endpoint is guarded by MCP_AUTH_TOKEN (when set): clients must include
//   it as a `?token=...` query parameter. This protects the otherwise-open MCP
//   endpoint without requiring a full OAuth implementation.

const PORT = Number.parseInt(process.env.PORT ?? "8080", 10);
const MCP_PATH = "/mcp";

function send(res: ServerResponse, status: number, body: string) {
	res.writeHead(status, { "Content-Type": "application/json" });
	res.end(body);
}

function jsonRpcError(res: ServerResponse, status: number, message: string) {
	send(
		res,
		status,
		JSON.stringify({
			jsonrpc: "2.0",
			error: { code: -32000, message },
			id: null,
		}),
	);
}

async function readBody(req: IncomingMessage): Promise<unknown> {
	const chunks: Buffer[] = [];
	for await (const chunk of req) {
		chunks.push(chunk as Buffer);
	}
	const raw = Buffer.concat(chunks).toString("utf-8");
	if (!raw) return undefined;
	return JSON.parse(raw);
}

async function handleMcpRequest(req: IncomingMessage, res: ServerResponse) {
	const apiKey = process.env.HEVY_API_KEY;
	if (!apiKey) {
		jsonRpcError(res, 500, "Server is missing the HEVY_API_KEY configuration.");
		return;
	}

	let body: unknown;
	try {
		body = await readBody(req);
	} catch {
		jsonRpcError(res, 400, "Request body is not valid JSON.");
		return;
	}

	// Stateless mode: a fresh server + transport per request avoids cross-request
	// session state and keeps the deployment horizontally scalable.
	const server = createMcpServer({ config: { apiKey } });
	const transport = new StreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
	});

	res.on("close", () => {
		void transport.close();
		void server.close();
	});

	await server.connect(transport);
	await transport.handleRequest(req, res, body);
}

const httpServer = createHttpServer((req, res) => {
	const url = new URL(
		req.url ?? "/",
		`http://${req.headers.host ?? "localhost"}`,
	);

	// Health probe for the platform (Azure Container Apps, etc.).
	if (req.method === "GET" && url.pathname === "/health") {
		send(res, 200, JSON.stringify({ status: "ok" }));
		return;
	}

	if (url.pathname !== MCP_PATH) {
		jsonRpcError(res, 404, "Not found.");
		return;
	}

	const requiredToken = process.env.MCP_AUTH_TOKEN;
	if (requiredToken && url.searchParams.get("token") !== requiredToken) {
		jsonRpcError(res, 401, "Unauthorized.");
		return;
	}

	if (req.method !== "POST") {
		res.writeHead(405, { Allow: "POST", "Content-Type": "application/json" });
		res.end(
			JSON.stringify({
				jsonrpc: "2.0",
				error: { code: -32000, message: "Method not allowed." },
				id: null,
			}),
		);
		return;
	}

	handleMcpRequest(req, res).catch((error: unknown) => {
		console.error("Error handling MCP request:", error);
		if (!res.headersSent) {
			jsonRpcError(res, 500, "Internal server error.");
		}
	});
});

httpServer.listen(PORT, () => {
	console.error(`hevy-mcp Streamable HTTP server listening on port ${PORT}`);
});
