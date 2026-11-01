const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:5000';

function buildReportFilename(type, format) {
  const safeType = String(type ?? 'report').trim() || 'report';
  const safeFormat = String(format ?? 'csv').trim() || 'csv';
  return `hostel-${safeType}-${safeFormat}.${safeFormat === 'pdf' ? 'pdf' : 'csv'}`;
}

export async function downloadReport(type, format, { fetchImpl = fetch, signal } = {}) {
  let response;
  try {
    response = await fetchImpl(`${API_BASE}/api/reports/${encodeURIComponent(type)}?format=${encodeURIComponent(format)}`, {
      method: 'GET',
      credentials: 'include',
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  if (response.ok) {
    const blob = response.blob ? await response.blob() : null;

    if (blob && typeof window !== 'undefined' && typeof document !== 'undefined') {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = buildReportFilename(type, format);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    return;
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.status === 401) {
    throw new Error('Your session has expired. Please log in again.');
  }
  if (response.status === 403) {
    throw new Error('Only an admin can export hostel reports.');
  }

  throw new Error(body?.error?.message ?? 'The export could not be created.');
}
