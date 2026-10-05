export function isOdyseeSource(source: string) {
  try {
    const hostname = new URL(source).hostname.toLowerCase();
    return hostname === "odysee.com" || hostname === "www.odysee.com";
  } catch {
    return false;
  }
}

export function odyseeUriFromSource(source: string) {
  if (!isOdyseeSource(source)) return null;
  const segments = new URL(source).pathname.split("/").filter(Boolean).map((segment) => {
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return segment;
    }
    const separator = decoded.lastIndexOf(":");
    return separator > 0 ? `${decoded.slice(0, separator)}#${decoded.slice(separator + 1)}` : decoded;
  });
  return segments.length > 0 ? `lbry://${segments.join("/")}` : null;
}
