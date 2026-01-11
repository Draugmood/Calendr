export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 10000,
): Promise<Response> {
  const controller = new AbortController();
  const id = window.setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    window.clearTimeout(id);
    return response;
  } catch (error: any) {
    window.clearTimeout(id);
    throw new Error(
      `Network request failed for ${url}: ${error?.message ?? error}`,
    );
  }
}
