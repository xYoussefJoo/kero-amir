/** Public origin of the site (no trailing slash), e.g. https://keroamir.com. */
export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
