// What the API actually puts in `message`, and how to show it to a person.
//
// Nest's exception filter sends a string for a thrown HttpException and an
// **array of strings** for a ValidationPipe failure. Everything in this app
// read `error.response.data.message` and rendered it directly, so a failed
// registration showed React's join-with-nothing of that array:
//
//   "email must be an emailpassword must be longer than or equal to 8 characters"
//
// One place that knows the shape, so no caller has to.

type ApiErrorShape = {
  response?: { data?: { message?: unknown }; status?: number };
  message?: string;
};

// Joined with a full stop and a space so several validation failures read as
// sentences rather than as one run-on string.
function fromUnknown(message: unknown): string | null {
  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }

  if (Array.isArray(message)) {
    const parts = message
      .filter((part): part is string => typeof part === 'string' && !!part.trim())
      .map((part) => part.trim());

    if (parts.length > 0) {
      return parts.join('. ');
    }
  }

  return null;
}

// `fallback` is the caller's own translated sentence — used whenever the server
// said nothing usable, which includes a network failure with no response at all.
export function apiErrorMessage(error: unknown, fallback: string): string {
  const shaped = error as ApiErrorShape | null | undefined;

  return fromUnknown(shaped?.response?.data?.message) ?? fallback;
}

// For the few places that branch on the status rather than the text.
export function apiErrorStatus(error: unknown): number | undefined {
  return (error as ApiErrorShape | null | undefined)?.response?.status;
}
