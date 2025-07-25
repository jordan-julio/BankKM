// functions.js
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

export async function downloadByType(file, fileType, selectedSheets, idType) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('file_type', fileType);
  formData.append('selected_sheets', JSON.stringify(selectedSheets));
  formData.append('id_type', idType);

  const response = await fetch(`${API_BASE}/download_by_type/`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }
  
  return response.blob();
}

export async function getSheetInfo(fileType, excelFile) {
  const form = new FormData();
  form.append('file', excelFile);
  form.append('file_type', fileType);

  const res = await fetch(`${API_BASE}/sheet_info/`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Sheet-info fetch failed');
  const { sheets = [] } = await res.json();
  return sheets;
}

export async function fetchIdsAndSheets(file, fileType, selectedSheets) {
  const form = new FormData();
  form.append('file', file);
  form.append('file_type', fileType);
  form.append('selected_sheets', JSON.stringify(selectedSheets));

  const res = await fetch(`${API_BASE}/ids/`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('IDs fetch failed');
  return await res.json(); // { ids, sheets }
}

export async function downloadBlob(endpoint, file, fileType, selectedSheets) {
  const form = new FormData();
  form.append('file', file);
  form.append('file_type', fileType);
  form.append('selected_sheets', JSON.stringify(selectedSheets));

  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`${endpoint} failed`);
  return await res.blob();
}

export async function fetchPdfBlob(file, fileType, selectedSheets, id) {
  const form = new FormData();
  form.append('file', file);
  form.append('file_type', fileType);
  form.append('selected_sheets', JSON.stringify(selectedSheets));
  form.append('id', id);

  const res = await fetch(`${API_BASE}/preview/`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Preview fetch failed');
  return await res.blob();
}
