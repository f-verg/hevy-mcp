import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Docker artifacts", () => {
	it("builds the Streamable HTTP server image", () => {
		const dockerfilePath = path.join(process.cwd(), "Dockerfile");
		const dockerfile = readFileSync(dockerfilePath, "utf-8");
		// Multi-stage Node 26 build that runs the remote HTTP entry point.
		expect(dockerfile).toContain("FROM node:26");
		expect(dockerfile).toContain("npm run build");
		expect(dockerfile).toContain('CMD ["node", "dist/http.mjs"]');
	});

	it("excludes node_modules and secrets from the build context", () => {
		const dockerignorePath = path.join(process.cwd(), ".dockerignore");
		const dockerignore = readFileSync(dockerignorePath, "utf-8");
		expect(dockerignore).toContain("node_modules");
		expect(dockerignore).toContain(".env");
	});
});
