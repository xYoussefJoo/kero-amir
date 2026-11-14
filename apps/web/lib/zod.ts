import { z } from "zod";

// Zod v4 probes `new Function` to JIT-compile validators; our CSP forbids eval, so tell it not to try.
z.config({ jitless: true });

export { z };
