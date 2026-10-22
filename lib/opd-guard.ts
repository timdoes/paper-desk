import { OPD_ENV_KEY_ID, OPD_ENV_SECRET } from "@/lib/constants";

export function opdKeysConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const key = env[OPD_ENV_KEY_ID]?.trim();
  const secret = env[OPD_ENV_SECRET]?.trim();
  return Boolean(key && secret);
}
