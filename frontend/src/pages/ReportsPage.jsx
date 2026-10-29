const API_BASE = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:5000';

function createError(message, code = 'REQUEST_FAILED') {
  const error = new Error(message);
  error.code = code;
  return error;
}

function responseError(response, body) {
  if (response.status === 401) {
    return createError('Your session has expired. Please log in again.', 'SESSION_EXPIRED');
  }
  if (response.status === 403) {
    return createError('You do not have permission to do that.', 'FORBIDDEN');
  }
  if (response.status === 400) {
    return createError(body?.error?.message ?? 'The report request is invalid.', 'VALIDATION_ERROR');
  }
  if (response.status === 404) {
    return createError('The report could not be found.', 'NOT_FOUND');
  }
  return createError(body?.error?.message ?? 'Could not generate the report.', 'REQUEST_FAILED');
}

async function readBlob(response) {
  return response.blob();
}

export async function downloadReport(type, format = 'csv', { fetchImpl = fetch } = {}) {
  let response;
  try {
    response = await fetchImpl(`${API_BASE}/api/reports/${encodeURIComponent(type)}?format=${encodeURIComponent(format)}`, {
      method: 'GET',
      credentials: 'include'
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw createError('Could not reach the server. Check your connection and try again.', 'NETWORK_ERROR');
  }

  if (!response.ok) {
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw responseError(response, body);
  }

  const blob = await readBlob(response);
  const contentDisposition = response.headers.get('Content-Disposition') || '';
  const match = contentDisposition.match(/filename="?([^";]+)"?/i);
  const fileName = match ? match[1] : `${type}-report.${format}`;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

  return { fileName, type, format, ok: true };
}

""" ,{"path":"frontend/src/api/reports.js"} ]
