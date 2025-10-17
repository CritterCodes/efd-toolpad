'use client';

import { useState, useEffect } from 'react';

export default function DiagnosticsAdminPage() {
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    errorType: '',
    resolved: '',
    userId: ''
  });
  const [selectedDiagnostic, setSelectedDiagnostic] = useState(null);
  const [stats, setStats] = useState([]);

  useEffect(() => {
    fetchDiagnostics();
  }, [filter]);

  const fetchDiagnostics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filter.errorType) params.append('errorType', filter.errorType);
      if (filter.resolved !== '') params.append('resolved', filter.resolved);
      if (filter.userId) params.append('userId', filter.userId);

      const response = await fetch(`/api/diagnostics?${params}`);
      const data = await response.json();
      
      setDiagnostics(data.diagnostics || []);
      setStats(data.statistics || []);
    } catch (error) {
      console.error('Failed to fetch diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDiagnostic = async (diagnosticId, updates) => {
    try {
      const response = await fetch('/api/diagnostics', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          diagnosticId,
          ...updates
        })
      });

      if (response.ok) {
        fetchDiagnostics(); // Refresh the list
        if (selectedDiagnostic?._id === diagnosticId) {
          setSelectedDiagnostic({ ...selectedDiagnostic, ...updates });
        }
      }
    } catch (error) {
      console.error('Failed to update diagnostic:', error);
    }
  };

  const getErrorTypeColor = (errorType) => {
    switch (errorType) {
      case 'authentication': return 'bg-red-100 text-red-800';
      case 'validation': return 'bg-yellow-100 text-yellow-800';
      case 'server-error': return 'bg-purple-100 text-purple-800';
      case 'network': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">Loading diagnostics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🔍 Artisan Application Diagnostics
          </h1>
          
          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {stats.map((stat) => (
              <div key={stat._id} className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-medium text-gray-900">{stat._id}</h3>
                <p className="text-2xl font-bold text-blue-600">{stat.count}</p>
                <p className="text-sm text-gray-500">
                  {stat.resolved} resolved
                </p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Error Type
                </label>
                <select
                  value={filter.errorType}
                  onChange={(e) => setFilter({ ...filter, errorType: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">All Types</option>
                  <option value="authentication">Authentication</option>
                  <option value="validation">Validation</option>
                  <option value="server-error">Server Error</option>
                  <option value="network">Network</option>
                  <option value="form-data-parsing">Form Data Parsing</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filter.resolved}
                  onChange={(e) => setFilter({ ...filter, resolved: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">All Status</option>
                  <option value="true">Resolved</option>
                  <option value="false">Unresolved</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User ID/Email
                </label>
                <input
                  type="text"
                  value={filter.userId}
                  onChange={(e) => setFilter({ ...filter, userId: e.target.value })}
                  placeholder="Search by user..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Diagnostics List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Diagnostics ({diagnostics.length})</h2>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {diagnostics.map((diagnostic) => (
                <div
                  key={diagnostic._id}
                  onClick={() => setSelectedDiagnostic(diagnostic)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedDiagnostic?._id === diagnostic._id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getErrorTypeColor(diagnostic.errorType)}`}>
                      {diagnostic.errorType}
                    </span>
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      diagnostic.resolved ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                  </div>
                  
                  <p className="font-medium text-gray-900 text-sm">
                    {diagnostic.error.message}
                  </p>
                  
                  <div className="text-xs text-gray-500 mt-1">
                    <p>User: {diagnostic.user.email || 'Unknown'}</p>
                    <p>Time: {new Date(diagnostic.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Diagnostic Details */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Diagnostic Details</h2>
            </div>
            
            {selectedDiagnostic ? (
              <div className="p-4">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex justify-between items-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getErrorTypeColor(selectedDiagnostic.errorType)}`}>
                      {selectedDiagnostic.errorType}
                    </span>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateDiagnostic(selectedDiagnostic._id, { resolved: !selectedDiagnostic.resolved })}
                        className={`px-3 py-1 rounded text-sm ${
                          selectedDiagnostic.resolved 
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {selectedDiagnostic.resolved ? 'Mark Unresolved' : 'Mark Resolved'}
                      </button>
                    </div>
                  </div>

                  {/* Error Info */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Error Details</h3>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <p><strong>Message:</strong> {selectedDiagnostic.error.message}</p>
                      <p><strong>Time:</strong> {new Date(selectedDiagnostic.timestamp).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* User Info */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">User Information</h3>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <p><strong>Email:</strong> {selectedDiagnostic.user.email || 'N/A'}</p>
                      <p><strong>Mongo ID:</strong> {selectedDiagnostic.user.mongoUserId || 'N/A'}</p>
                      <p><strong>Shopify ID:</strong> {selectedDiagnostic.user.shopifyCustomerId || 'N/A'}</p>
                      <p><strong>Authenticated:</strong> {selectedDiagnostic.user.isAuthenticated ? '✅' : '❌'}</p>
                    </div>
                  </div>

                  {/* Form Data */}
                  {selectedDiagnostic.formData?.fields && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Form Data</h3>
                      <div className="bg-gray-50 p-3 rounded text-sm max-h-32 overflow-y-auto">
                        <p><strong>Missing Required:</strong> {selectedDiagnostic.formData.missingRequiredFields?.join(', ') || 'None'}</p>
                        <p><strong>Files:</strong> {selectedDiagnostic.formData.fileCount || 0}</p>
                        <p><strong>Form Size:</strong> {(selectedDiagnostic.formData.formSize || 0)} bytes</p>
                      </div>
                    </div>
                  )}

                  {/* Environment */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Environment</h3>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <p><strong>User Agent:</strong> {selectedDiagnostic.environment?.userAgent?.substring(0, 60)}...</p>
                      <p><strong>Online:</strong> {selectedDiagnostic.environment?.onLine ? '✅' : '❌'}</p>
                      <p><strong>Cookies:</strong> {selectedDiagnostic.environment?.cookiesEnabled ? '✅' : '❌'}</p>
                    </div>
                  </div>

                  {/* Admin Notes */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Admin Notes</h3>
                    <textarea
                      value={selectedDiagnostic.adminNotes || ''}
                      onChange={(e) => setSelectedDiagnostic({ 
                        ...selectedDiagnostic, 
                        adminNotes: e.target.value 
                      })}
                      onBlur={(e) => updateDiagnostic(selectedDiagnostic._id, { 
                        adminNotes: e.target.value 
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      rows="3"
                      placeholder="Add notes about this diagnostic..."
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                Select a diagnostic to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}