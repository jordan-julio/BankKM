'use client';
import React, { useState, useMemo } from 'react';
import { downloadBlob, fetchIdsAndSheets, fetchPdfBlob } from './functions';
import { AlertCircle, Check, Download, FileText, Filter, Search, Upload, Loader2, CreditCard, Wallet } from 'lucide-react';
import { SearchableDropdown } from './components/SearchableDropdown';

// Mock PdfPreview component for demo
const PdfPreview = ({ url }) => (
  <div className="w-full h-screen bg-gray-100 flex items-center justify-center">
    <iframe src={url} className="w-full h-full border-0" />
  </div>
);

// Loading Spinner Component
const LoadingSpinner = ({ size = "medium", text = "Loading..." }) => {
  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-6 h-6", 
    large: "w-8 h-8"
  };

  return (
    <div className="flex items-center justify-center space-x-2">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      <span className="text-gray-600">{text}</span>
    </div>
  );
};

// Download Progress Modal
const DownloadModal = ({ isOpen, onClose, downloadType, progress }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[rgb(0,0,0)]/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Download className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Preparing Download</h3>
          <p className="text-gray-600 mb-4">
            {downloadType === 'combined' 
              ? 'Creating combined PDF file...' 
              : 'Generating individual PDF files and creating ZIP archive...'
            }
          </p>
          <LoadingSpinner size="large" text="Please wait..." />
          
          {/* Progress bar placeholder */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{Math.floor(progress)}% complete</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StepIndicator = ({ currentStep, completedSteps }) => {
  const steps = [
    { id: 1, title: 'File Type', description: 'Choose format' },
    { id: 2, title: 'Upload', description: 'Select Excel file' },
    { id: 3, title: 'Configure', description: 'Select sheets' },
    { id: 4, title: 'Preview', description: 'View & download' }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                completedSteps.includes(step.id) 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : currentStep === step.id
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-white border-gray-300 text-gray-500'
              }`}>
                {completedSteps.includes(step.id) ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <div className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {step.description}
                </div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 ${
                completedSteps.includes(step.id) ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
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
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [processingSheets, setProcessingSheets] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [downloadModal, setDownloadModal] = useState({ isOpen: false, type: '', progress: 0 });

  const currentStep = useMemo(() => {
    if (!fileType) return 1;
    if (!file) return 2;
    if (selectedSheets.length === 0) return 3;
    return 4;
  }, [fileType, file, selectedSheets]);

  const completedSteps = useMemo(() => {
    const completed = [];
    if (fileType) completed.push(1);
    if (file) completed.push(2);
    if (selectedSheets.length > 0) completed.push(3);
    return completed;
  }, [fileType, file, selectedSheets]);

  // File type options
  const fileTypeOptions = [
    { value: 'bank', label: 'Bank Masuk/Bank Keluar', icon: <CreditCard />, description: '' },
    { value: 'kas', label: 'Kas Masuk/Kas Keluar', icon: <Wallet />, description: '' }
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

  // Simulate progress for downloads
  const simulateProgress = (callback) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 95) {
        progress = 100;
        clearInterval(interval);
        setTimeout(callback, 500);
      }
      setDownloadModal(prev => ({ ...prev, progress: Math.min(progress, 100) }));
    }, 200);
  };

  // Get sheet information
  async function getSheetInfo(excelFile) {
    const formData = new FormData();
    formData.append('file', excelFile);
    formData.append('file_type', fileType);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/sheet_info/`, {
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
    setUploadingFile(true);

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
      setUploadingFile(false);
    }
  }

  // Process selected sheets to get IDs
  async function processSelectedSheets() {
    if (!file || !selectedSheets.length) return;
    setProcessingSheets(true);
    try {
      const { ids, sheets } = await fetchIdsAndSheets(file, fileType, selectedSheets);
      setIds(ids);
      setSheets(sheets);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingSheets(false);
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

  async function previewPdf(id) {
    if (!file || !id) return;
    setLoadingPreview(true);
    try {
      const blob = await fetchPdfBlob(file, fileType, selectedSheets, id);
      setPdfUrl(URL.createObjectURL(blob));
      setSelectedId(id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPreview(false);
    }
  }

  // Download all PDFs
  async function downloadAll() {
    setDownloadModal({ isOpen: true, type: 'zip', progress: 0 });
    
    simulateProgress(async () => {
      try {
        const blob = await downloadBlob('generate_all/', file, fileType, selectedSheets);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileType === 'kas' ? 'KM_KK' : 'BK'}_All_Files.zip`;
        link.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error(err);
      } finally {
        setDownloadModal({ isOpen: false, type: '', progress: 0 });
      }
    });
  }

  async function downloadAllAsOneFile() {
    if (!file || selectedSheets.length === 0) return;

    setDownloadModal({ isOpen: true, type: 'combined', progress: 0 });
    
    simulateProgress(async () => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_type', fileType);
        formData.append('selected_sheets', JSON.stringify(selectedSheets));

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/download_combined/`, {
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
      } catch (err) {
        console.error(err);
      } finally {
        setDownloadModal({ isOpen: false, type: '', progress: 0 });
      }
    });
  }

  // Handle type change and reset selected ID
  const handleTypeChange = (type) => {
    setSelectedType(type);
    setSelectedId('');
    setPdfUrl(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-visible">
      <div className="container mx-auto px-4 py-8 max-w-6xl overflow-visible">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Excel to PDF Converter
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Transform your Excel files into professional PDF documents with ease. 
            Support for both bank and cash transaction formats.
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl overflow-visible">
          <div className="p-8 space-y-8">
            
            {/* Step 1: File Type Selection */}
            <div className={`transition-all duration-300 ${currentStep >= 1 ? 'opacity-100' : 'opacity-50'}`}>
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-semibold">1</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Choose File Type</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fileTypeOptions.map((option) => (
                  <label 
                    key={option.value}
                    className={`group relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                      fileType === option.value
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                    <input
                      type="radio"
                      name="fileType"
                      value={option.value}
                      checked={fileType === option.value}
                      onChange={(e) => handleFileTypeChange(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex items-start">
                      <div className="text-3xl mr-4">{option.icon}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1">{option.label}</div>
                        <div className="text-sm text-gray-600">{option.description}</div>
                      </div>
                      {fileType === option.value && (
                        <div className="absolute top-4 right-4">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Step 2: File Upload */}
            <div className={`transition-all duration-300 ${currentStep >= 2 ? 'opacity-100' : 'opacity-50'}`}>
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-semibold">2</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Upload Excel File</h2>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingFile}
                />
                
                {!file ? (
                  <label htmlFor="file-input" className={`cursor-pointer ${uploadingFile ? 'pointer-events-none' : ''}`}>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <div className="text-lg font-medium text-gray-900 mb-2">
                      Drop your Excel file here or click to browse
                    </div>
                    <div className="text-sm text-gray-500">
                      Supports .xlsx files up to 10MB
                    </div>
                    <div className="mt-4">
                      <span className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
                        uploadingFile 
                          ? 'bg-gray-400 text-white cursor-not-allowed' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}>
                        {uploadingFile ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Select File
                          </>
                        )}
                      </span>
                    </div>
                  </label>
                ) : (
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                      <FileText className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="font-medium text-gray-900 mb-2">{file.name}</div>
                    <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {fileType === 'kas' ? 'Cash Format' : 'Bank Format'}
                    </div>
                    {uploadingFile && (
                      <div className="mt-4">
                        <LoadingSpinner text="Analyzing file structure..." />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Sheet Selection */}
            {availableSheets.length > 0 && (
              <div className={`transition-all duration-300 ${currentStep >= 3 ? 'opacity-100' : 'opacity-50'}`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-semibold">3</span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Configure Sheets</h2>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={selectAllSheets}
                      disabled={processingSheets}
                      className="text-sm px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAllSheets}
                      disabled={processingSheets}
                      className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {availableSheets.map((sheet) => (
                    <label 
                      key={sheet.name}
                      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedSheets.includes(sheet.name)
                          ? 'border-blue-500 bg-blue-50'
                          : sheet.status === 'readable'
                          ? 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                          : 'border-red-200 bg-red-50 cursor-not-allowed'
                      } ${processingSheets ? 'pointer-events-none opacity-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSheets.includes(sheet.name)}
                        onChange={() => handleSheetToggle(sheet.name)}
                        disabled={sheet.status !== 'readable' || processingSheets}
                        className="sr-only"
                      />
                      
                      <div className="flex items-start">
                        <div className={`w-5 h-5 rounded border-2 mr-3 mt-0.5 flex items-center justify-center ${
                          selectedSheets.includes(sheet.name)
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedSheets.includes(sheet.name) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{sheet.name}</div>
                          <div className={`text-xs mt-1 flex items-center ${
                            sheet.status === 'readable' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {sheet.status === 'readable' ? (
                              <>
                                <Check className="w-3 h-3 mr-1" />
                                Ready to process
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {sheet.error}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">
                    {selectedSheets.length} of {availableSheets.length} sheets selected
                  </span>
                  <button
                    onClick={processSelectedSheets}
                    disabled={selectedSheets.length === 0 || processingSheets}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center ${
                      selectedSheets.length === 0 || processingSheets
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {processingSheets ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Process Selected Sheets'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Processed Sheets Info */}
            {sheets.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Check className="w-5 h-5 text-green-600 mr-2" />
                  <h3 className="font-medium text-green-800">Successfully Processed</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sheets.map((sheet) => (
                    <span 
                      key={sheet.name}
                      className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                    >
                      {sheet.name} ({sheet.count} records)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Preview and Download */}
            {ids.length > 0 && (
              <div className={`transition-all duration-300 ${currentStep >= 4 ? 'opacity-100' : 'opacity-50'}`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-semibold">4</span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Preview & Download</h2>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={downloadAllAsOneFile}
                      disabled={selectedSheets.length === 0 || downloadModal.isOpen}
                      className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedSheets.length === 0 || downloadModal.isOpen
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {downloadModal.isOpen && downloadModal.type === 'combined' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      Combined PDF
                    </button>
                    <button
                      onClick={downloadAll}
                      disabled={selectedSheets.length === 0 || downloadModal.isOpen}
                      className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedSheets.length === 0 || downloadModal.isOpen
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {downloadModal.isOpen && downloadModal.type === 'zip' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      All PDFs (ZIP)
                    </button>
                  </div>
                </div>

                {/* Filter and Preview Section */}
                <div className="space-y-6">
                  {/* Type Filter */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Filter className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Filter:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => handleTypeChange(type)}
                          disabled={loadingPreview}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            selectedType === type
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } ${loadingPreview ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {filteredIds.length} items
                    </span>
                  </div>

                  {/* ID Selector */}
                  <div className="flex items-center space-x-4 overflow-visible">
                    <div className="flex items-center">
                      <Search className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        Select ID:
                      </span>
                    </div>
                    <div className="flex-1 max-w-md relative">
                      <SearchableDropdown
                        options={filteredIds}
                        value={selectedId}
                        onChange={previewPdf}
                        placeholder={`Search ${selectedType === 'ALL' ? 'transaction' : selectedType} IDs...`}
                        className="w-full"
                        disabled={loadingPreview}
                      />
                      {loadingPreview && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Loading Preview State */}
                  {loadingPreview && selectedId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <LoadingSpinner text={`Loading preview for ${selectedId}...`} />
                    </div>
                  )}

                  {/* Selected ID Display */}
                  {selectedId && !loadingPreview && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-blue-600 mr-2" />
                        <span className="text-blue-800 font-medium">
                          Currently viewing: {selectedId}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* PDF Preview */}
                  {pdfUrl && !loadingPreview && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <PdfPreview url={pdfUrl} />
                      <div className="p-4 bg-gray-50 flex justify-between items-center">
                        <span className="text-sm text-gray-600">PDF Preview</span>
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          Open in New Tab →
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Download Modal */}
      <DownloadModal 
        isOpen={downloadModal.isOpen}
        onClose={() => setDownloadModal({ isOpen: false, type: '', progress: 0 })}
        downloadType={downloadModal.type}
        progress={downloadModal.progress}
      />
    </div>
  );
}