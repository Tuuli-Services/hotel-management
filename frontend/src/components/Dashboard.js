// frontend/src/components/Dashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    FaUsers, FaUserFriends, FaBed, FaDoorOpen, FaCalendarCheck, FaSyncAlt, FaExclamationTriangle
} from 'react-icons/fa'; // Added warning icon

function Dashboard({ refreshTrigger, token }) {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(() => {
        // Ensure token exists before fetching
        if (!token) {
            setError("Authentication error. Please log in again.");
            setLoading(false); // Stop loading if no token
            setSummary(null); // Clear previous data
            return;
        }
        console.log("Dashboard: Fetching data..."); // Debug log
        setLoading(true);
        setError(''); // Clear previous errors
        fetch('http://localhost:5001/api/dashboard/summary', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}` // Include auth token
            }
        })
        .then(async (res) => { // Make async to parse JSON even on error
            const data = await res.json().catch(() => null); // Try parsing JSON, default to null on error
            console.log("Dashboard response status:", res.status, "Data:", data); // Debug log
            if (!res.ok) {
                // Use error message from backend if available, else use status text
                 const errorMsg = data?.message || res.statusText || `HTTP error ${res.status}`;
                 throw new Error(errorMsg);
            }
            return data; // Return parsed data on success
        })
        .then(data => {
            if (data) {
                setSummary(data); // Update state with fetched data
            } else {
                 throw new Error("Received empty data from server."); // Handle case where data is null/undefined
            }
        })
        .catch(err => {
            console.error("Error fetching dashboard:", err);
            setError(`Failed to load dashboard: ${err.message}`);
            setSummary(null); // Clear summary data on error
        })
        .finally(() => {
             // *** CRITICAL: Ensure loading state is always turned off ***
            setLoading(false);
        });
    }, [token]); // Depend on token

    // Effect to fetch data on mount and when refreshTrigger or token changes
    useEffect(() => {
        fetchData();
    }, [refreshTrigger, fetchData]); // Use fetchData from useCallback

    // --- Render Logic ---
    return (
        <div className="dashboard">
            <h2>Dashboard Overview</h2>

            {/* Loading State */}
            {loading && <p>Loading dashboard...</p>}

            {/* Error State */}
            {error && !loading && (
                <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <FaExclamationTriangle /> {error}
                </div>
            )}

            {/* Success State */}
            {summary && !loading && !error && (
                <div className="dashboard-metrics">
                    {/* Metric Items using summary data */}
                    <MetricItem icon={<FaUsers />} label="Current Stays" value={summary.currentInHouseGuests} />
                    <MetricItem icon={<FaUserFriends />} label="Total Guests" value={summary.totalGuestsInHouse} />
                    <MetricItem icon={<FaBed />} label="Occupied Rooms" value={`${summary.occupiedRooms} / ${summary.totalRooms}`} />
                    <MetricItem icon={<FaDoorOpen />} label="Available Rooms" value={summary.availableRooms} />
                    <MetricItem icon={<FaCalendarCheck />} label="Today's Check-ins" value={summary.todaysCheckins} />
                    {/* Add more metrics here */}
                </div>
            )}

            {/* Refresh Button - Don't show if error prevents fetch */}
            {!error && (
                 <button onClick={fetchData} disabled={loading} className="dashboard-refresh-button">
                    <FaSyncAlt style={{ marginRight: '8px', verticalAlign: 'middle' }} className={loading ? 'spin' : ''} />
                    {loading ? 'Refreshing...' : 'Refresh Dashboard'}
                </button>
            )}
            {/* Add spinning animation CSS if not already present */}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; } `}</style>
        </div>
    );
}

// Helper component for consistent metric display
const MetricItem = ({ icon, label, value }) => (
    <div className="metric-item">
        {icon}
        <div>
            <span className="metric-label">{label}</span>
            <span className="metric-value">{value ?? 'N/A'}</span> {/* Handle null/undefined values */}
        </div>
    </div>
);

export default Dashboard;