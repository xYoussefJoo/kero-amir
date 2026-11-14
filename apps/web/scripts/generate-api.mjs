// Regenerates lib/api/schema.d.ts from the API's OpenAPI document.
// Usage: npm run api:generate   (OPENAPI_URL defaults to the local API)
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const packageDir = path.dirname(require.resolve("openapi-typescript/package.json"));
const cli = path.join(packageDir, require("openapi-typescript/package.json").bin["openapi-typescript"]);

const url = process.env.OPENAPI_URL ?? "http://localhost:5080/openapi/v1.json";
console.log(`Generating lib/api/schema.d.ts from ${url}`);
execFileSync(process.execPath, [cli, url, "-o", "lib/api/schema.d.ts"], { stdio: "inherit" });
