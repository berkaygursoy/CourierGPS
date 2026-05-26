export class ApiError extends Error {
  constructor({ status, code, message, details }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  // 204 No Content has an empty body — bypass JSON parsing.
  if (res.status === 204) return null;

  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const err = body?.error ?? {};
    throw new ApiError({
      status: res.status,
      code: err.code ?? 'UNKNOWN',
      message: err.message ?? res.statusText,
      details: err.details,
    });
  }

  return body;
}
