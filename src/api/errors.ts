export class APIError extends Error {
  public readonly status: number;
  public readonly provider: string;
  public readonly code: string;
  public readonly details: unknown;

  constructor(opts: {
    message: string;
    status: number;
    provider: string;
    code?: string;
    details?: unknown;
  }) {
    super(opts.message);
    this.name = "APIError";
    this.status = opts.status;
    this.provider = opts.provider;
    this.code = opts.code ?? "UNKNOWN";
    this.details = opts.details;

    Object.setPrototypeOf(this, APIError.prototype);
  }

  public toString(): string {
    return `[${this.provider}] ${this.status} — ${this.message} (code: ${this.code})`;
  }
}

export class AuthError extends Error {
  public readonly provider: string;

  constructor(opts: { message: string; provider: string }) {
    super(opts.message);
    this.name = "AuthError";
    this.provider = opts.provider;

    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

export class ProviderNotConnectedError extends Error {
  public readonly provider: string;

  constructor(provider: string) {
    super(`Provider "${provider}" is not connected. Run: conjra add ${provider}`);
    this.name = "ProviderNotConnectedError";
    this.provider = provider;

    Object.setPrototypeOf(this, ProviderNotConnectedError.prototype);
  }
}

export class ToolExecutionError extends Error {
  public readonly toolName: string;
  public readonly cause: Error;

  constructor(opts: { toolName: string; cause: Error }) {
    super(`Tool "${opts.toolName}" failed: ${opts.cause.message}`);
    this.name = "ToolExecutionError";
    this.toolName = opts.toolName;
    this.cause = opts.cause;

    Object.setPrototypeOf(this, ToolExecutionError.prototype);
  }
}

export function isAPIError(err: unknown): err is APIError {
  return err instanceof APIError;
}

export function isAuthError(err: unknown): err is AuthError {
  return err instanceof AuthError;
}

export function isProviderNotConnectedError(err: unknown): err is ProviderNotConnectedError {
  return err instanceof ProviderNotConnectedError;
}