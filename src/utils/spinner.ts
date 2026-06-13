import ora, { type Ora } from "ora";

export function createSpinner(text: string): Ora {
  return ora({ text, spinner: "dots" });
}

export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
  successText?: string
): Promise<T> {
  const spinner = createSpinner(text);
  spinner.start();
  try {
    const result = await fn();
    spinner.succeed(successText ?? text);
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    spinner.fail(`${text} — ${message}`);
    throw err;
  }
}