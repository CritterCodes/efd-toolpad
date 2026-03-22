import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getSTLVolume } from '@/lib/stlParser';

export function useCADDesignManager() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState(0);
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [uploadDialog, setUploadDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewType, setPreviewType] = useState('glb');
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuDesignId, setMenuDesignId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    notes: '',
    stlFile: null,
    glbFile: null,
    cadRequestId: '',
  });

  const [calculating, setCalculating] = useState(false);
  const [calculatedVolume, setCalculatedVolume] = useState(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchDesigns();
    }
  }, [session]);

  const fetchDesigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/cad/designs?userId=${session.user.id}`);

      if (!res.ok) throw new Error('Failed to fetch designs');

      const data = await res.json();
      setDesigns(data.designs || []);
    } catch (err) {
      console.error('Error fetching designs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleOpenUploadDialog = () => {
    setFormData({
      title: '',
      description: '',
      notes: '',
      stlFile: null,
      glbFile: null,
      cadRequestId: '',
    });
    setCalculatedVolume(null);
    setUploadDialog(true);
  };

  const handleCloseUploadDialog = () => {
    setUploadDialog(false);
  };

  const handleFileChange = async (event, fileType) => {
    const file = event.target.files[0];
    if (!file) return;

    if (fileType === 'stlFile') {
      try {
        setCalculating(true);
        const volume = await getSTLVolume(file);
        setCalculatedVolume(Math.round(volume));
      } catch (err) {
        setError(`Volume calculation failed: ${err.message}`);
      } finally {
        setCalculating(false);
      }
    }

    setFormData(prev => ({
      ...prev,
      [fileType]: file
    }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitDesign = async () => {
    try {
      if (!formData.title || (!formData.stlFile && !formData.glbFile)) {
        setError('Title and at least one file (STL or GLB) required');
        return;
      }

      setLoading(true);
      setError(null);

      const uploadFormData = new FormData();
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('notes', formData.notes);
      uploadFormData.append('cadRequestId', formData.cadRequestId);
      uploadFormData.append('printVolume', calculatedVolume || 0);

      if (formData.stlFile) {
        uploadFormData.append('stlFile', formData.stlFile);
      }
      if (formData.glbFile) {
        uploadFormData.append('glbFile', formData.glbFile);
      }

      const res = await fetch('/api/cad/designs/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!res.ok) throw new Error('Upload failed');

      await fetchDesigns();
      setUploadDialog(false);
    } catch (err) {
      console.error('Error uploading design:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMenu = (event, designId) => {
    setAnchorEl(event.currentTarget);
    setMenuDesignId(designId);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuDesignId(null);
  };

  const handleViewDetails = (design) => {
    setSelectedDesign(design);
    setDetailDialog(true);
    handleCloseMenu();
  };

  const handlePreview = (design, fileType) => {
    if (fileType === 'stl' && design.stlUrl) {
      setPreviewFile(design.stlUrl);
      setPreviewType('stl');
      setPreviewDialog(true);
    } else if (fileType === 'glb' && design.glbUrl) {
      setPreviewFile(design.glbUrl);
      setPreviewType('glb');
      setPreviewDialog(true);
    }
    handleCloseMenu();
  };

  const handleDeleteDesign = async (designId) => {
    if (window.confirm('Are you sure you want to delete this design?')) {
      try {
        setLoading(true);
        const res = await fetch(`/api/cad/designs/${designId}`, {
          method: 'DELETE'
        });

        if (!res.ok) throw new Error('Delete failed');

        await fetchDesigns();
        handleCloseMenu();
      } catch (err) {
        console.error('Error deleting design:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const stlDesigns = designs.filter(d => d.stlUrl && (!d.status || d.status === 'pending'));
  const glbDesigns = designs.filter(d => d.glbUrl);
  const approvedDesigns = designs.filter(d => d.status === 'approved');
  const declinedDesigns = designs.filter(d => d.status === 'declined');

  const isCadDesigner = session?.user?.artisanTypes?.includes('CAD Designer');

  return {
    session,
    isCadDesigner,
    activeTab,
    designs,
    loading,
    error,
    setError,
    uploadDialog,
    detailDialog,
    previewDialog,
    selectedDesign,
    anchorEl,
    menuDesignId,
    previewFile,
    previewType,
    formData,
    calculating,
    calculatedVolume,
    stlDesigns,
    glbDesigns,
    approvedDesigns,
    declinedDesigns,
    handleTabChange,
    handleOpenUploadDialog,
    handleCloseUploadDialog,
    handleFileChange,
    handleFormChange,
    handleSubmitDesign,
    handleOpenMenu,
    handleCloseMenu,
    handleViewDetails,
    handlePreview,
    handleDeleteDesign,
    setDetailDialog,
    setPreviewDialog,
  };
}