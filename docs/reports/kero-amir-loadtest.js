// k6 load test for Kero Amir (Performance & Security Report, section 6).
// Run ONLY against a deployment you own (ideally staging), outside peak hours:
//   k6 run -e WEB_URL=https://<web-host> -e API_URL=https://kero-amir.runasp.net docs/reports/kero-amir-loadtest.js
// Ramps slowly. The browse scenario hits static pages (served from cache); the api scenario hits the public,
// output-cached read endpoints at a low rate. It never calls login, admin or any write endpoint, and sends no email.
import http from "k6/http";
import { check, sleep } from "k6";

const WEB = __ENV.WEB_URL || "http://localhost:4400";
const API = __ENV.API_URL || "http://localhost:5080";

export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      exec: "browse",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 25 },
        { duration: "2m", target: 100 },
        { duration: "1m", target: 0 },
      ],
    },
    api: {
      executor: "constant-arrival-rate",
      exec: "api",
      rate: 5, // requests per second: low on purpose (shared hosting)
      timeUnit: "1s",
      duration: "3m",
      preAllocatedVUs: 5,
      maxVUs: 20,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{scenario:browse}": ["p(95)<800"],
    "http_req_duration{scenario:api}": ["p(95)<1000"],
  },
};

export function browse() {
  const locale = Math.random() < 0.5 ? "en" : "de";
  const res = http.get(`${WEB}/${locale}`);
  check(res, { "page 200": (r) => r.status === 200 });
  sleep(5); // typical read time
}

const ENDPOINTS = ["settings?locale=en", "skills?locale=de", "timeline?locale=en", "categories?locale=de", "tools"];

export function api() {
  const path = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
  const res = http.get(`${API}/api/v1/${path}`, { headers: { "Accept-Encoding": "br, gzip" } });
  check(res, { "api 200": (r) => r.status === 200 });
}
