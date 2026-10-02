import https from "node:https";

// ponytail: forces IPv4 because this machine's IPv6 route is broken (Next's fetch picks it and hangs) — drop family:4 once the OS-level IPv6 is fixed
export function request(
  url: string,
  opts: { method?: "GET" | "POST"; body?: string; headers?: Record<string, string>; timeoutMs?: number } = {},
): Promise<unknown> {
  const { method = "GET", body, headers = {}, timeoutMs = 20000 } = opts;
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      { method, family: 4, headers, timeout: timeoutMs },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
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
  });
}
