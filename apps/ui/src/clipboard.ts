import copyToClipboard from "copy-to-clipboard";

export async function copyText(value: string): Promise<boolean> {
  const clipboard = navigator.clipboard;

  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(value);
      return true;
    } catch {
      // Plain-HTTP origins and denied permissions still get the local DOM fallback.
    }
  }

  return copyToClipboard(value, { format: "text/plain" });
}
