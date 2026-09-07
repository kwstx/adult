import { NextRequest } from "next/server";
import { ApiError } from "./api-handler";

export type ValidationRule<T = any> = (value: any, key: string) => T;

export class Validator {
  /**
   * Validates and parses JSON body from request against schema rules.
   */
  static async validateBody<T extends Record<string, any>>(
    req: NextRequest,
    schema: { [K in keyof T]: ValidationRule<T[K]> }
  ): Promise<T> {
    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON payload in request body.", "INVALID_JSON");
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ApiError(400, "Request body must be a JSON object.", "INVALID_BODY");
    }

    const validated: Record<string, any> = {};
    for (const [key, rule] of Object.entries(schema)) {
      validated[key] = (rule as ValidationRule)(body[key], key);
    }

    return validated as T;
  }

  /**
   * Validates query search parameters from request URL against schema rules.
   */
  static validateQuery<T extends Record<string, any>>(
    req: NextRequest,
    schema: { [K in keyof T]: ValidationRule<T[K]> }
  ): T {
    const { searchParams } = new URL(req.url);
    const validated: Record<string, any> = {};

    for (const [key, rule] of Object.entries(schema)) {
      const rawValue = searchParams.get(key);
      validated[key] = (rule as ValidationRule)(rawValue === null ? undefined : rawValue, key);
    }

    return validated as T;
  }
}

// ----------------------------------------------------------------------------
// Validation Rule Builders
// ----------------------------------------------------------------------------

export function vString(options: {
  required?: boolean;
  min?: number;
  max?: number;
  email?: boolean;
  uuid?: boolean;
  defaultValue?: string;
} = {}): ValidationRule<string | undefined> {
  return (value: any, key: string) => {
    if (value === undefined || value === null || value === "") {
      if (options.required) {
        throw new ApiError(400, `Field "${key}" is required.`, "VALIDATION_REQUIRED");
      }
      return options.defaultValue;
    }

    if (typeof value !== "string") {
      throw new ApiError(400, `Field "${key}" must be a string.`, "VALIDATION_TYPE");
    }

    const trimmed = value.trim();

    if (options.min !== undefined && trimmed.length < options.min) {
      throw new ApiError(400, `Field "${key}" must be at least ${options.min} characters.`, "VALIDATION_MIN_LENGTH");
    }

    if (options.max !== undefined && trimmed.length > options.max) {
      throw new ApiError(400, `Field "${key}" cannot exceed ${options.max} characters.`, "VALIDATION_MAX_LENGTH");
    }

    if (options.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      throw new ApiError(400, `Field "${key}" must be a valid email address.`, "VALIDATION_EMAIL");
    }

    if (options.uuid && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      throw new ApiError(400, `Field "${key}" must be a valid UUID.`, "VALIDATION_UUID");
    }

    return trimmed;
  };
}

export function vNumber(options: {
  required?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
  defaultValue?: number;
} = {}): ValidationRule<number | undefined> {
  return (value: any, key: string) => {
    if (value === undefined || value === null || value === "") {
      if (options.required) {
        throw new ApiError(400, `Field "${key}" is required.`, "VALIDATION_REQUIRED");
      }
      return options.defaultValue;
    }

    const num = typeof value === "number" ? value : Number(value);

    if (isNaN(num)) {
      throw new ApiError(400, `Field "${key}" must be a valid number.`, "VALIDATION_TYPE");
    }

    if (options.integer && !Number.isInteger(num)) {
      throw new ApiError(400, `Field "${key}" must be an integer.`, "VALIDATION_INTEGER");
    }

    if (options.min !== undefined && num < options.min) {
      throw new ApiError(400, `Field "${key}" must be at least ${options.min}.`, "VALIDATION_MIN_VALUE");
    }

    if (options.max !== undefined && num > options.max) {
      throw new ApiError(400, `Field "${key}" cannot exceed ${options.max}.`, "VALIDATION_MAX_VALUE");
    }

    return num;
  };
}

export function vBoolean(options: {
  required?: boolean;
  defaultValue?: boolean;
} = {}): ValidationRule<boolean | undefined> {
  return (value: any, key: string) => {
    if (value === undefined || value === null || value === "") {
      if (options.required) {
        throw new ApiError(400, `Field "${key}" is required.`, "VALIDATION_REQUIRED");
      }
      return options.defaultValue;
    }

    if (typeof value === "boolean") return value;
    if (value === "true" || value === "1" || value === 1) return true;
    if (value === "false" || value === "0" || value === 0) return false;

    throw new ApiError(400, `Field "${key}" must be a boolean.`, "VALIDATION_TYPE");
  };
}

export function vEnum<T extends string>(
  validValues: readonly T[] | T[],
  options: { required?: boolean; defaultValue?: T } = {}
): ValidationRule<T | undefined> {
  return (value: any, key: string) => {
    if (value === undefined || value === null || value === "") {
      if (options.required) {
        throw new ApiError(400, `Field "${key}" is required.`, "VALIDATION_REQUIRED");
      }
      return options.defaultValue;
    }

    if (typeof value !== "string" || !validValues.includes(value as T)) {
      throw new ApiError(
        400,
        `Field "${key}" must be one of: [${validValues.join(", ")}].`,
        "VALIDATION_ENUM"
      );
    }

    return value as T;
  };
}

export function vArray<T = any>(
  itemRule?: ValidationRule<T>,
  options: { required?: boolean; min?: number; max?: number; defaultValue?: T[] } = {}
): ValidationRule<T[] | undefined> {
  return (value: any, key: string) => {
    if (value === undefined || value === null) {
      if (options.required) {
        throw new ApiError(400, `Field "${key}" is required.`, "VALIDATION_REQUIRED");
      }
      return options.defaultValue;
    }

    if (!Array.isArray(value)) {
      throw new ApiError(400, `Field "${key}" must be an array.`, "VALIDATION_TYPE");
    }

    if (options.min !== undefined && value.length < options.min) {
      throw new ApiError(400, `Field "${key}" must contain at least ${options.min} items.`, "VALIDATION_MIN_ITEMS");
    }

    if (options.max !== undefined && value.length > options.max) {
      throw new ApiError(400, `Field "${key}" cannot contain more than ${options.max} items.`, "VALIDATION_MAX_ITEMS");
    }

    if (itemRule) {
      return value.map((item, index) => itemRule(item, `${key}[${index}]`));
    }

    return value;
  };
}
