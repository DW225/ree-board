import { loadEnvConfig } from "@next/env";
import { validateLocalE2e } from "./lib/config/localE2e";

if (!validateLocalE2e()) loadEnvConfig(process.cwd());
validateLocalE2e();
