import https from "node:https";

// ponytail: forces IPv4 because this machine's IPv6 route is broken (Next's fetch picks it and hangs) — drop family:4 once the OS-level IPv6 is fixed
export function request(
  url: string,
  opts: {
    method?: "GET" | "POST" | "HEAD";
    body?: string;
    headers?: Record<string, string>;
    timeoutMs?: number;
    /** resolve the raw body instead of JSON-parsing it (HTML pages) */
    text?: boolean;
  } = {},
): Promise<unknown> {
  const { method = "GET", body, headers = {}, timeoutMs = 20000, text = false } = opts;
  return new Promise((resolve, reject) => {
    // shortcut: redirects keep the original method (fine for our GET callers;
    // switch to a 303→GET downgrade if a POST endpoint ever redirects)
    let hops = 0;
    const go = (u: string) => {
      const req = https.request(
        u,
        { method, family: 4, headers, timeout: timeoutMs },
        (res) => {
          let data = "";
          res.on("data", (c) => (data += c));
          res.on("end", () => {
            const loc = res.headers.location;
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && loc && hops++ < 3)
              return go(new URL(loc, u).toString());
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
            if (text) return resolve(data);
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error("Invalid JSON"));
            }
          });
        },
      );
      req.on("timeout", () => req.destroy(new Error("timeout")));
      req.on("error", reject);
      if (body) req.write(body);
      req.end();
    };
    go(url);
  });
}
