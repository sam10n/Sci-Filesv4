// Helpers for requesting camera access and diagnosing why it fails,
// especially on mobile / inside iframes where the permission prompt is suppressed.

export function isInIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function isSecureContext() {
  return window.isSecureContext;
}

/**
 * Query the Permissions API for the current camera permission state.
 * Returns 'granted' | 'denied' | 'prompt' | 'unsupported'.
 */
export async function getCameraPermissionState() {
  try {
    if (!navigator.permissions || !navigator.permissions.query) return "unsupported";
    const res = await navigator.permissions.query({ name: "camera" });
    return res.state; // 'granted' | 'denied' | 'prompt'
  } catch {
    return "unsupported";
  }
}

/**
 * Open the current page in a fresh top-level tab so the browser can show
 * the camera permission prompt (blocked inside iframes without allow="camera").
 */
export function openStandalone(path) {
  const url = path ? new URL(path, window.location.origin).href : window.location.href;
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Turn a getUserMedia error into a user-friendly explanation.
 */
export function describeCameraError(err) {
  const name = err?.name || "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return {
        title: "Camera access blocked",
        description:
          "Your browser blocked the camera. Open the app in a new tab (outside the preview frame), then tap Allow when asked. If you previously denied access, enable it in your browser site settings.",
        showOpenButton: true
      };
    case "NotFoundError":
    case "DevicesNotFoundError":
      return {
        title: "No camera found",
        description: "We couldn't detect a camera on this device."
      };
    case "NotReadableError":
    case "TrackStartError":
      return {
        title: "Camera in use",
        description: "Another app is using the camera. Close it and try again."
      };
    case "OverconstrainedError":
      return {
        title: "Camera not supported",
        description: "This device's camera doesn't support the requested settings."
      };
    default:
      return {
        title: "Camera unavailable",
        description: err?.message || "We couldn't access the camera. Please try again."
      };
  }
}