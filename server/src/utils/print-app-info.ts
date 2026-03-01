export function printAppInfo(
  port: number,
  env: string,
  appUrl: string,
  apiUrl: string
): void {
  console.log(`[server] Environment: ${env}`);
  console.log(`[server] App URL: ${appUrl}`);
  console.log(`[server] API base: ${apiUrl}`);
  console.log(`[server] Listening on http://localhost:${port}`);
}
