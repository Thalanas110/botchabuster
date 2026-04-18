import assert from "node:assert/strict";
import test from "node:test";
import { createCorsOptions, getAllowedOrigins, isOriginAllowed, parseAllowedOrigins } from "./cors";

test("parseAllowedOrigins trims whitespace and removes empty entries", () => {
  assert.deepEqual(
    parseAllowedOrigins(" https://app.example.com , , https://admin.example.com "),
    ["https://app.example.com", "https://admin.example.com"],
  );
});

test("isOriginAllowed matches both exact origins and wildcard preview domains", () => {
  const allowedOrigins = [
    "https://meatlens.netlify.app",
    "https://*--meatlens.netlify.app",
  ];

  assert.equal(isOriginAllowed("https://meatlens.netlify.app", allowedOrigins), true);
  assert.equal(isOriginAllowed("https://deploy-preview-12--meatlens.netlify.app", allowedOrigins), true);
  assert.equal(isOriginAllowed("https://other-app.netlify.app", allowedOrigins), false);
});

test("getAllowedOrigins falls back to localhost origins outside production", () => {
  assert.deepEqual(
    getAllowedOrigins({ NODE_ENV: "development" }),
    [
      "http://localhost:8080",
      "http://127.0.0.1:8080",
      "http://localhost:4173",
      "http://127.0.0.1:4173",
    ],
  );
});

test("getAllowedOrigins requires explicit origins in production", () => {
  assert.deepEqual(getAllowedOrigins({ NODE_ENV: "production" }), []);
});

test("createCorsOptions allows requests without an origin header", async () => {
  const options = createCorsOptions([]);

  await new Promise<void>((resolve, reject) => {
    const originHandler = options.origin as NonNullable<typeof options.origin>;

    originHandler(undefined, (error, allow) => {
      try {
        assert.equal(error, null);
        assert.equal(allow, true);
        resolve();
      } catch (assertionError) {
        reject(assertionError);
      }
    });
  });
});

