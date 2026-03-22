import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export const useArtisanProfile = () => {
    const { data: session } = useSession();

    const [profileData, setProfileData] = useState({
        businessName: '',
        artisanType: [],
        about: '',
        experience: '',
        yearsExperience: 0,
        businessAddress: '',
        businessCity: '',
        businessState: '',
        businessZip: '',
        businessCountry: 'United States',
        portfolioWebsite: '',
        instagramHandle: '',
        facebookPage: '',
        tiktokHandle: '',
        specialties: [],
        services: [],
        materials: [],
        techniques: [],
        profileImage: null,
        coverImage: null
    });

    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [profileImagePreview, setProfileImagePreview] = useState(null);
    const [coverImagePreview, setCoverImagePreview] = useState(null);
    const [saveStatus, setSaveStatus] = useState(null);

    useEffect(() => {
        loadProfileData();
    }, [session]);

    const loadProfileData = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/artisan/profile');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    const profile = data.data;
                    setProfileData({
                        businessName: profile.businessName || '',
                        artisanType: parseArrayField(profile.artisanType),
                        about: profile.about || '',
                        experience: profile.experience || '',
                        yearsExperience: profile.yearsExperience || 0,
                        businessAddress: profile.businessAddress || '',
                        businessCity: profile.businessCity || '',
                        businessState: profile.businessState || '',
                        businessZip: profile.businessZip || '',
                        businessCountry: profile.businessCountry || 'United States',
                        portfolioWebsite: profile.portfolioWebsite || '',
                        instagramHandle: profile.instagramHandle || '',
                        facebookPage: profile.facebookPage || '',
                        tiktokHandle: profile.tiktokHandle || '',
                        specialties: parseArrayField(profile.specialties),
                        services: parseArrayField(profile.services),
                        materials: parseArrayField(profile.materials),
                        techniques: parseArrayField(profile.techniques),
                        profileImage: null,
                        coverImage: null
                    });

                    if (profile.profileImageUrl) {
                        setProfileImagePreview(profile.profileImageUrl);
                    }
                    if (profile.coverImageUrl) {
                        setCoverImagePreview(profile.coverImageUrl);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading profile data:', error);
        } finally {
            setLoading(false);
        }
    };

    const parseArrayField = (field) => {
        if (!field) return [];
        if (Array.isArray(field)) return field;
        return field.split(',').map(item => item.trim()).filter(item => item !== '');
    };

    const handleInputChange = (field, value) => {
        setProfileData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleImageUpload = (event, type) => {
        const file = event.target.files[0];
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            if (type === 'profile') {
                setProfileImagePreview(previewUrl);
                setProfileData(prev => ({ ...prev, profileImage: file }));
            } else if (type === 'cover') {
                setCoverImagePreview(previewUrl);
                setProfileData(prev => ({ ...prev, coverImage: file }));
            }
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveStatus(null);
        try {
            const formData = new FormData();
            Object.keys(profileData).forEach(key => {
                if (key === 'profileImage' || key === 'coverImage') {
                    if (profileData[key]) {
                        formData.append(key, profileData[key]);
                    }
                } else if (Array.isArray(profileData[key])) {
                    formData.append(key, profileData[key].join(', '));
                } else {
                    formData.append(key, profileData[key] || '');
                }
            });

            const response = await fetch('/api/artisan/profile', {
                method: 'PUT',
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                setSaveStatus({ type: 'success', message: 'Profile updated successfully!' });
                loadProfileData();
            } else {
                setSaveStatus({ type: 'error', message: result.error || 'Failed to update profile' });
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            setSaveStatus({ type: 'error', message: 'Failed to save profile. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    return {
        profileData,
        loading,
        saving,
        saveStatus,
        profileImagePreview,
        coverImagePreview,
        handleInputChange,
        handleImageUpload,
        handleSave
    };
};