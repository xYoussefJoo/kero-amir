/**
 * Public origin of the site (no trailing slash), e.g. https://keroamir.com.
 * On Vercel it defaults to the project's production domain, so previews still point search engines at production.
 */
const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const SITE_URL = (process.env.SITE_URL ?? (vercelDomain ? `https://${vercelDomain}` : "http://localhost:3000")).replace(/\/+$/, "");
