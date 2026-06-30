import { defineNitroConfig } from "nitropack/config";

export default defineNitroConfig({
  routeRules: {
    "/**": {
      headers: {
        "Content-Security-Policy": "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline' 'unsafe-eval'; img-src * data: blob: 'unsafe-inline'; style-src * 'unsafe-inline';",
      },
    },
  },
});
