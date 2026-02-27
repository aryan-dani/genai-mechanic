import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import axios from 'axios';
import './ImageUpload.css';

const ImageUpload = ({ setSessionData }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, uploading, success, error
    const [errorMessage, setErrorMessage] = useState('');
    const fileInputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const onButtonClick = () => {
        fileInputRef.current.click();
    };

    const handleFile = async (file) => {
        if (!file.type.startsWith('image/')) {
            setStatus('error');
            setErrorMessage('Please upload an image file');
            return;
        }

        setStatus('uploading');
        setErrorMessage('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            // In production use env vars for API URL
            const response = await axios.post('http://localhost:8000/api/vision/extract', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const data = response.data;

            setSessionData(prev => ({
                ...prev,
                rpm: data.rpm || prev.rpm,
                speed: data.speed || prev.speed,
                load: data.load || prev.load,
                temp: data.temp || prev.temp,
                dtc: data.dtc || prev.dtc
            }));

            setStatus('success');
            setTimeout(() => setStatus('idle'), 3000);

        } catch (err) {
            console.error(err);
            setStatus('error');
            setErrorMessage(err.response?.data?.detail || 'Extraction failed');
        }
    };

    return (
        <div className="upload-container">
            <div
                className={`drop-zone ${isDragging ? 'drag-active' : ''} ${status === 'error' ? 'has-error' : ''} ${status === 'success' ? 'is-success' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={onButtonClick}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="file-input-hidden"
                    onChange={handleChange}
                />

                {status === 'idle' && (
                    <div className="drop-content">
                        <UploadCloud size={24} className="upload-icon" />
                        <p className="upload-text">Drag & drop or <span>browse</span></p>
                    </div>
                )}

                {status === 'uploading' && (
                    <div className="drop-content">
                        <Loader2 size={24} className="upload-icon spinning text-primary" />
                        <p className="upload-text">Extracting telemetry...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="drop-content">
                        <CheckCircle size={24} className="upload-icon text-success" />
                        <p className="upload-text text-success">Extraction Complete</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="drop-content">
                        <AlertTriangle size={24} className="upload-icon text-danger" />
                        <p className="upload-text text-danger">{errorMessage}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageUpload;
