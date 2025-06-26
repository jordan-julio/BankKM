'use client';
import React, { useState, useMemo } from 'react';

// Mock PdfPreview component for demo
const PdfPreview = ({ url }) => (
  <div className="w-full h-screen bg-gray-100 flex items-center justify-center">
    <iframe src={url} className="w-full h-full border-0" />
  </div>
);

// Searchable dropdown component
const SearchableDropdown = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Search...",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option => 
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const handleSelect = (option) => {
    onChange(option);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={value || searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-gray-500">No results found</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleSelect(option)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                >
                  {option}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default function App() {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState('bank'); // 'bank' or 'kas'
  const [ids, setIds] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheets, setSelectedSheets] = useState([]);
  const [selectedType, setSelectedType] = useState('ALL'); // 'ALL', 'BK', 'BM', 'KM', 'KK', etc.
  const [selectedId, setSelectedId] = useState('');
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  // File type options
  const fileTypeOptions = [
    { value: 'bank', label: 'Bank Masuk/Bank Keluar', description: '' },
    { value: 'kas', label: 'Kas Masuk/Kas Keluar', description: '' }
  ];

  // Get unique ID prefixes from the IDs based on file type
  const availableTypes = useMemo(() => {
    const prefixes = new Set(['ALL']);
    ids.forEach(id => {
      if (fileType === 'kas') {
        // For Kas files, look for KM/KK prefixes
        const match = id.match(/^(KM|KK)/);
        if (match) {
          prefixes.add(match[0]);
        }
      } else {
        // For Bank files, look for B-prefixed entries
        const match = id.match(/^B[A-Z0-9]+/);
        if (match) {
          prefixes.add(match[0]);
        }
      }
    });
    return Array.from(prefixes).sort();
  }, [ids, fileType]);

  // Filter IDs based on selected type
  const filteredIds = useMemo(() => {
    if (selectedType === 'ALL') return ids;
    return ids.filter(id => id.startsWith(selectedType));
  }, [ids, selectedType]);

  // Reset state when file type changes
  const handleFileTypeChange = (newFileType) => {
    setFileType(newFileType);
    setFile(null);
    setIds([]);
    setSheets([]);
    setAvailableSheets([]);
    setSelectedSheets([]);
    setSelectedType('ALL');
    setSelectedId('');
    setPdfUrl(null);
  };

  // Get sheet information
  async function getSheetInfo(excelFile) {
    const formData = new FormData();
    formData.append('file', excelFile);
    formData.append('file_type', fileType);

    try {
      const response = await fetch('http://localhost:8000/sheet_info/', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      return data.sheets || [];
    } catch (error) {
      console.error('Error getting sheet info:', error);
      return [];
    }
  }

  // Upload Excel and get sheet info first
  async function handleFileUpload(e) {
    const excelFile = e.target.files[0];
    if (!excelFile) return;
    
    setFile(excelFile);
    setPdfUrl(null);
    setSelectedId('');
    setIds([]);
    setSheets([]);
    setSelectedSheets([]);
    setLoading(true);

    try {
      // First get sheet information
      const sheetInfo = await getSheetInfo(excelFile);
      setAvailableSheets(sheetInfo);
      
      // Auto-select all readable sheets by default
      const readableSheets = sheetInfo
        .filter(sheet => sheet.status === 'readable')
        .map(sheet => sheet.name);
      setSelectedSheets(readableSheets);
      
    } catch (error) {
      console.error('Error processing file:', error);
    } finally {
      setLoading(false);
    }
  }

  // Process selected sheets to get IDs
  async function processSelectedSheets() {
    if (!file || selectedSheets.length === 0) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('file_type', fileType);
      formData.append('selected_sheets', JSON.stringify(selectedSheets));

      const response = await fetch('http://localhost:8000/ids/', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setIds(data.ids);
      setSheets(data.sheets || []);
    } catch (error) {
      console.error('Error processing sheets:', error);
    } finally {
      setLoading(false);
    }
  }

  // Handle sheet selection changes
  const handleSheetToggle = (sheetName) => {
    setSelectedSheets(prev => {
      if (prev.includes(sheetName)) {
        return prev.filter(name => name !== sheetName);
      } else {
        return [...prev, sheetName];
      }
    });
  };

  const selectAllSheets = () => {
    const readableSheets = availableSheets
      .filter(sheet => sheet.status === 'readable')
      .map(sheet => sheet.name);
    setSelectedSheets(readableSheets);
  };

  const deselectAllSheets = () => {
    setSelectedSheets([]);
  };

  // Preview selected ID
  async function previewPdf(id) {
    if (!file || !id || selectedSheets.length === 0) return;
    setSelectedId(id);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('id', id);
    formData.append('file_type', fileType);
    formData.append('selected_sheets', JSON.stringify(selectedSheets));

    const response = await fetch('http://localhost:8000/preview/', {
      method: 'POST',
      body: formData,
    });
    const blob = await response.blob();
    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
    const url = URL.createObjectURL(pdfBlob);
    setPdfUrl(url);
  }

  // Download all PDFs
  async function downloadAll() {
    if (!file || selectedSheets.length === 0) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);
    formData.append('selected_sheets', JSON.stringify(selectedSheets));

    const response = await fetch('http://localhost:8000/generate_all/', {
      method: 'POST',
      body: formData,
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileType === 'kas' ? 'KM_KK' : 'BK'}_All_Files.zip`;
    link.click();
  }

  async function downloadAllAsOneFile() {
    if (!file || selectedSheets.length === 0) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);
    formData.append('selected_sheets', JSON.stringify(selectedSheets));

    const response = await fetch('http://localhost:8000/download_combined/', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      console.error('Download failed:', response.statusText);
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileType === 'kas' ? 'KM_KK' : 'BK'}_Combined_File.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  // Handle type change and reset selected ID
  const handleTypeChange = (type) => {
    setSelectedType(type);
    setSelectedId('');
    setPdfUrl(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 w-full">
      <div className="w-full bg-white rounded-xl shadow-md overflow-visible">
        {/* Header */}
        <header className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-800">
            Excel to PDF
          </h1>
          <p className="text-gray-600 mt-1">
            Upload Excel convert to PDFs.
          </p>
        </header>

        {/* Content */}
        <main className="p-6 space-y-6 w-full">
          {/* File Type Selection */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-3">Select File Type:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fileTypeOptions.map((option) => (
                <label 
                  key={option.value}
                  className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition ${
                    fileType === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="fileType"
                    value={option.value}
                    checked={fileType === option.value}
                    onChange={(e) => handleFileTypeChange(e.target.value)}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{option.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <input
              id="file-input"
              type="file"
              accept=".xlsx"
              onChange={handleFileUpload}
              className="hidden"
              disabled={loading}
            />
            <label
              htmlFor="file-input"
              className={`px-4 py-2 rounded-lg shadow transition ${
                loading 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700'
              }`}
            >
              {loading ? 'Processing...' : `Upload ${fileType === 'kas' ? 'Kas' : 'Bank'} Excel File`}
            </label>
            {file && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-gray-600 truncate">{file.name}</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {fileType === 'kas' ? 'Kas Format' : 'Bank Format'}
                </span>
              </div>
            )}
            {ids.length > 0 && (
              <>
                <button
                  onClick={downloadAllAsOneFile}
                  disabled={selectedSheets.length === 0}
                  className={`ml-auto px-4 py-2 rounded-lg shadow transition ${
                    selectedSheets.length === 0
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Download All as One File
                </button>
                <button
                  onClick={downloadAll}
                  disabled={selectedSheets.length === 0}
                  className={`ml-auto px-4 py-2 rounded-lg shadow transition ${
                    selectedSheets.length === 0
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Download All PDFs
                </button>
              </>
            )}
          </div>

          {/* Sheet Selection */}
          {availableSheets.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-800">Select Sheets to Process:</h3>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllSheets}
                    className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllSheets}
                    className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {availableSheets.map((sheet) => (
                  <label 
                    key={sheet.name}
                    className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition ${
                      selectedSheets.includes(sheet.name)
                        ? 'border-blue-500 bg-blue-50'
                        : sheet.status === 'readable'
                        ? 'border-gray-200 bg-white hover:border-gray-300'
                        : 'border-red-200 bg-red-50 cursor-not-allowed'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSheets.includes(sheet.name)}
                      onChange={() => handleSheetToggle(sheet.name)}
                      disabled={sheet.status !== 'readable'}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-800">{sheet.name}</div>
                      <div className={`text-xs ${
                        sheet.status === 'readable' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {sheet.status === 'readable' ? 'Ready' : `Error: ${sheet.error}`}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedSheets.length} of {availableSheets.length} sheets selected
                </span>
                <button
                  onClick={processSelectedSheets}
                  disabled={selectedSheets.length === 0 || loading}
                  className={`px-4 py-2 rounded-lg shadow transition ${
                    selectedSheets.length === 0 || loading
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {loading ? 'Processing...' : 'Process Selected Sheets'}
                </button>
              </div>
            </div>
          )}

          {/* Sheet Information */}
          {sheets.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2">Processed Sheets:</h3>
              <div className="flex flex-wrap gap-2">
                {sheets.map((sheet) => (
                  <span 
                    key={sheet.name}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                  >
                    {sheet.name} ({sheet.count} records)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Type Filter and ID Selector */}
          {ids.length > 0 && (
            <div className="space-y-4">
              {/* Type Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <label className="text-gray-700 font-medium">Filter by Type:</label>
                <div className="flex flex-wrap gap-2">
                  {availableTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => handleTypeChange(type)}
                      className={`px-4 py-2 rounded-lg border transition ${
                        selectedType === type
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-gray-500">
                  ({filteredIds.length} items)
                </span>
              </div>

              {/* ID Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <label className="text-gray-700 font-medium w-full sm:w-auto">
                  Select {selectedType === 'ALL' ? 'Transaction' : selectedType} ID:
                </label>
                <SearchableDropdown
                  options={filteredIds}
                  value={selectedId}
                  onChange={previewPdf}
                  placeholder={`Search ${selectedType === 'ALL' ? 'transaction' : selectedType} IDs...`}
                  className="w-full sm:w-2/3"
                />
              </div>

              {/* Selected ID Display */}
              {selectedId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <span className="text-blue-800 font-medium">
                    Selected: {selectedId}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* PDF Preview */}
          {pdfUrl && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <PdfPreview url={pdfUrl} />
              <div className="p-4 bg-gray-50 text-right">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Open in New Tab
                </a>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}