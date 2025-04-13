// frontend/src/components/CheckInForm.js
import React, { useState, useEffect, useCallback } from 'react';

function CheckInForm({ onCheckInSuccess, token }) {
    // State variables
    const [formData, setFormData] = useState({
        name: '', contact: '', email: '', idType: '', idNumber: '',
        nationality: '', adults: '1', children: '0', expectedCheckout: '',
        roomNumber: '', notes: '',
    });
    const [availableRooms, setAvailableRooms] = useState([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loadingRooms, setLoadingRooms] = useState(false);

    // Fetch available rooms
    const fetchRooms = useCallback(() => {
        setLoadingRooms(true);
        setError(''); // Clear previous room errors
        fetch('http://localhost:5001/api/rooms') // This endpoint is currently public
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch rooms list');
                return res.json();
            })
            .then(data => {
                const available = data.filter(room => room.status === 'Available');
                setAvailableRooms(available);
                // Auto-select first available room if none is selected, only if rooms loaded successfully
                if (!formData.roomNumber && available.length > 0) {
                     setFormData(prev => ({ ...prev, roomNumber: available[0].id }));
                }
            })
            .catch(err => {
                 console.error("Error fetching rooms:", err);
                 setError("Could not load available rooms.");
                 setAvailableRooms([]); // Clear rooms on error
            })
            .finally(() => {
                setLoadingRooms(false);
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run memoized fetchRooms

    useEffect(() => {
        fetchRooms(); // Fetch rooms on initial mount
    }, [fetchRooms]);

    // Handle form input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value,
        }));
         // Clear room selection error if user changes selection
         if (name === 'roomNumber') {
             setError('');
         }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        // Frontend Validation
        if (!token) {
             setError('Authentication error. Please log in again.');
             return;
        }
        if (!formData.roomNumber) {
            setError('Please select an available room.');
            return;
        }
        // Optional: Re-check if selected room is still in the 'availableRooms' list
        const selectedRoomStillAvailable = availableRooms.some(r => r.id === formData.roomNumber);
        if (!selectedRoomStillAvailable) {
             setError(`Room ${formData.roomNumber} might no longer be available. Refreshing list...`);
             fetchRooms(); // Refresh room list automatically
             return;
        }

        setSubmitting(true); // Set loading state
        console.log("Submitting check-in:", formData); // Debug log

        try {
            const response = await fetch('http://localhost:5001/api/guests/checkin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Include auth token
                },
                body: JSON.stringify(formData),
            });

            const result = await response.json(); // Try parsing JSON
            console.log("Check-in response status:", response.status, "Data:", result); // Debug log

            if (response.ok) { // Status 201 usually
                setMessage(`Success! Guest ${result.name} checked into room ${result.roomNumber}.`);
                // Reset form
                setFormData({
                    name: '', contact: '', email: '', idType: '', idNumber: '',
                    nationality: '', adults: '1', children: '0', expectedCheckout: '',
                    roomNumber: '', // Clear room selection
                    notes: '',
                });
                fetchRooms(); // Fetch rooms again to update dropdown
                if (onCheckInSuccess) {
                    onCheckInSuccess(); // Trigger dashboard refresh
                }
            } else {
                // Use error message from backend response
                setError(result.message || `Check-in failed with status: ${response.status}`);
                console.error("Check-in failed:", result.message || `Status ${response.status}`);
                // If failure was due to room conflict (409), refresh room list
                 if (response.status === 409) {
                     fetchRooms();
                 }
            }
        } catch (err) {
            // Catch network errors or issues parsing JSON
            console.error("Check-in fetch/parse error:", err);
            setError(`Check-in request failed. Check connection or server status.`);
        } finally {
             // *** CRITICAL: Ensure submitting state is always turned off ***
             setSubmitting(false);
        }
    };

    // --- Render Logic ---
    return (
        <div className="check-in-form">
            <h2>Guest Check-In</h2>
            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}

            <form onSubmit={handleSubmit}>
                {/* Input Fields - ensure `value` and `onChange` are correct */}
                <div style={formRowStyle}>
                    <label htmlFor="name">Full Name*</label>
                    <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required disabled={submitting} />
                </div>
                <div style={formRowStyle}>
                    <label htmlFor="contact">Contact Number*</label>
                    <input type="tel" id="contact" name="contact" value={formData.contact} onChange={handleChange} required disabled={submitting} />
                </div>
                 <div style={formRowStyle}>
                    <label htmlFor="roomNumber">Assign Room*</label>
                    <select id="roomNumber" name="roomNumber" value={formData.roomNumber} onChange={handleChange} required disabled={submitting || loadingRooms}>
                        <option value="" disabled>
                            {loadingRooms ? 'Loading rooms...' : '-- Select Available Room --'}
                        </option>
                        {availableRooms.map(room => (
                            <option key={room.id} value={room.id}>
                                Room {room.id} ({room.type} - ${room.rate}/night)
                            </option>
                        ))}
                        {availableRooms.length === 0 && !loadingRooms && !error && <option disabled>No Rooms Available</option>}
                         {error && !loadingRooms && <option disabled>Error loading rooms</option>}
                    </select>
                </div>
                {/* Add other fields similarly */}
                <div style={formRowStyle}>
                    <label htmlFor="email">Email Address</label>
                    <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} disabled={submitting}/>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                     <div style={formRowStyle}>
                        <label htmlFor="adults">Adults</label>
                        <input type="number" id="adults" name="adults" min="1" value={formData.adults} onChange={handleChange} disabled={submitting}/>
                    </div>
                     <div style={formRowStyle}>
                        <label htmlFor="children">Children</label>
                        <input type="number" id="children" name="children" min="0" value={formData.children} onChange={handleChange} disabled={submitting}/>
                    </div>
                 </div>
                <div style={formRowStyle}>
                    <label htmlFor="expectedCheckout">Expected Checkout Date</label>
                    <input type="date" id="expectedCheckout" name="expectedCheckout" value={formData.expectedCheckout} onChange={handleChange} disabled={submitting}/>
                </div>
                {/* Add ID Type, Number, Nationality */}
                <div style={formRowStyle}>
                    <label htmlFor="notes">Notes / Special Requests</label>
                    <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} disabled={submitting}></textarea>
                 </div>

                <button type="submit" disabled={submitting || loadingRooms || !formData.roomNumber}>
                    {submitting ? 'Checking In...' : 'Check-In Guest'}
                </button>
            </form>
        </div>
    );
}
// Simple style for form rows (can move to CSS)
const formRowStyle = { marginBottom: '15px' };

export default CheckInForm;