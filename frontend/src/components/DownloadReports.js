// frontend/src/components/DownloadReports.js
import React, { useState } from 'react';
import { FaFileCsv, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';

function DownloadReports({ token }) {
    const [loadingPeriod, setLoadingPeriod] = useState(null); // Track which report is loading: 'daily', 'weekly', etc.
    const [error, setError] = useState('');

    const handleDownload = async (period) => {
        // Validation
        if (!token) {
            setError("Authentication token not found. Please log in again.");
            return;
        }
        setError(''); // Clear previous errors
        setLoadingPeriod(period); // Set loading state for this button

        console.log(`Attempting to download ${period} report...`); // Debug log

        try {
            const response = await fetch(`http://localhost:5001/api/reports/download?period=${period}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`, // Send auth token
                },
            });

            console.log(`Download response status (${period}):`, response.status); // Debug log

            if (!response.ok) {
                let errorMsg = `Error downloading ${period} report (${response.status})`;
                try {
                    // Try to get specific error message from backend JSON response
                    const errData = await response.json();
                    errorMsg = `${errorMsg}: ${errData.message || 'Unknown server error'}`;
                } catch (e) {
                    // If response is not JSON or parsing fails, use status text
                    errorMsg = `${errorMsg}: ${response.statusText || 'Server error'}`;
                }
                throw new Error(errorMsg);
            }

            // Handle successful file download
            const blob = await response.blob(); // Get response body as a Blob

            // Extract filename from Content-Disposition header (more robust)
            const contentDisposition = response.headers.get('content-disposition');
            let filename = `report_${period}.csv`; // Default filename
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";]+)['"]?/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }
            console.log(`Downloaded blob for ${period}, filename: ${filename}`); // Debug log

            // Create temporary link and trigger download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();

            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            console.log(`Download triggered for ${filename}`); // Debug log

        } catch (err) {
            // Catch network errors or errors thrown above
            console.error(`Download error (${period}):`, err);
            setError(err.message || `Failed to download ${period} report.`);
        } finally {
            // *** CRITICAL: Ensure loading state is always turned off for this period ***
            setLoadingPeriod(null);
        }
    };

    // Helper to render buttons
    const renderButton = (period, label) => (
        <button
            onClick={() => handleDownload(period)}
            disabled={loadingPeriod !== null} // Disable all buttons if any is loading
            style={styles.button}
            title={`Download ${label}`}
        >
            {loadingPeriod === period ? (
                <FaSpinner className="spin" style={{ marginRight: '5px' }} /> // Spinner icon
            ) : (
                <FaFileCsv style={{ marginRight: '5px' }} /> // CSV icon
            )}
            {loadingPeriod === period ? 'Generating...' : label}
        </button>
    );

    // --- Render Logic ---
    return (
        // Add card styling if desired, e.g., className="card-style"
        <div className="download-reports card-style">
            <h2>Download Check-in Reports (CSV)</h2>
            {error && (
                <p className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <FaExclamationTriangle /> {error}
                </p>
             )}
            <div style={styles.buttonGroup}>
                {renderButton('daily', 'Daily Report')}
                {renderButton('weekly', 'Weekly Report')}
                {renderButton('monthly', 'Monthly Report')}
                {renderButton('yearly', 'Yearly Report')}
            </div>
            {/* Add CSS for spinning animation if not already present */}
             <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; } .card-style { background-color: var(--card-background); padding: 25px 30px; border-radius: var(--border-radius); box-shadow: var(--shadow); border: 1px solid var(--border-color); margin-top: 30px; } `}</style>
        </div>
    );
}

// Basic styles (can move to CSS)
const styles = {
     buttonGroup: { display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '10px' },
    button: {
         backgroundColor: 'var(--secondary-color)', color: 'white', padding: '10px 15px',
         border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem',
         fontWeight: '500', transition: 'background-color 0.2s ease, opacity 0.2s ease',
         display: 'inline-flex', alignItems: 'center',
    },
    // Add hover/disabled styles if needed, e.g., button:disabled { opacity: 0.6; cursor: not-allowed; }
};

export default DownloadReports;