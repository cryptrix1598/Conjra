import { cosmiconfig } from "cosmiconfig";
import { z, ZodType } from "zod";
import { logger } from "./logger.js";

const explorer = cosmiconfig("conjra", {
  searchPlaces: [
    "conjra.config.ts",
    "conjra.config.js",
    "conjra.config.json",
    "package.json",
  ],
});

const ConjraConfigSchema = z.object({
  providers: z.array(z.string()).optional().default([]),
  mcpServerCommand: z.string().optional(),
});

export type ConjraConfig = z.infer<typeof ConjraConfigSchema>;

export async function loadConfig(): Promise<ConjraConfig> {
  try {
    const result = await explorer.search();
    if (!result || result.isEmpty) {
      return { providers: [] };
    }
    const parsed = ConjraConfigSchema.safeParse(result.config);
    if (!parsed.success) {
      logger.warn("Invalid conjra config, using defaults");
      return { providers: [] };
    }
    return parsed.data;
  } catch {
    return { providers: [] };
  }
}

export async function saveConfig(_config: ConjraConfig): Promise<void> {
  logger.warn("Config file writing is not yet implemented. Use CLI commands instead.");
}

export function validateConfig<T>(schema: ZodType<T>, data: unknown): T {
  return schema.parse(data);
}