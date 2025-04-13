// frontend/src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import CheckInForm from './components/CheckInForm';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Signup from './components/Signup';
import DownloadReports from './components/DownloadReports';
import { FaSignOutAlt } from 'react-icons/fa';

function App() {
    const [token, setToken] = useState(null); // Initialize token state to null
    const [user, setUser] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0); // For dashboard refresh trigger
    const [showLogin, setShowLogin] = useState(true); // Start with login view if logged out

    // Function to handle logout consistently
    const handleLogout = useCallback(() => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        setToken(null);
        setUser(null);
        setShowLogin(true); // Reset to login view
        console.log("User logged out.");
    }, []); // Empty dependency array as it doesn't depend on external state

    // Effect to check for token and user data on initial load or when token might change
    useEffect(() => {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('authUser');

        if (storedToken && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                // Optional: Add basic validation for stored user object
                if (parsedUser && parsedUser.id) {
                    setToken(storedToken);
                    setUser(parsedUser);
                    console.log("App useEffect: Found valid token and user in storage.");
                } else {
                    console.log("App useEffect: Stored user data invalid.");
                    handleLogout(); // Clear invalid data
                }
            } catch (e) {
                console.error("App useEffect: Failed to parse stored user, logging out.", e);
                handleLogout(); // Clear corrupted data
            }
        } else {
            // If either token or user is missing, ensure logged out state
            if (token || user) { // Only log out if state is inconsistent
                 console.log("App useEffect: Token or user missing from storage, ensuring logout state.");
                 handleLogout();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount effectively, logout handled by useCallback

    // Handler for successful login
    const handleLoginSuccess = (newToken, loggedInUser) => {
        if (newToken && loggedInUser) {
            localStorage.setItem('authToken', newToken);
            localStorage.setItem('authUser', JSON.stringify(loggedInUser));
            setToken(newToken);
            setUser(loggedInUser);
            setShowLogin(true); // Ensure login view is default next time
            console.log("Login successful, user:", loggedInUser);
        } else {
            console.error("handleLoginSuccess called with invalid token or user data.");
        }
    };

    // Handler for successful check-in to refresh dashboard
    const handleCheckInSuccess = () => {
        console.log("Check-in successful, triggering dashboard refresh...");
        setRefreshKey(prevKey => prevKey + 1); // Increment key to trigger dashboard useEffect
    };


    // --- Render Logic ---

    // If not logged in, show Login or Signup form
    if (!token) {
        return (
            <div className="auth-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
                {showLogin ? (
                    <Login
                        onLoginSuccess={handleLoginSuccess}
                        onSwitchToSignup={() => setShowLogin(false)}
                    />
                ) : (
                    <Signup
                        onSwitchToLogin={() => setShowLogin(true)}
                    />
                )}
            </div>
        );
    }

    // If logged in, show the main application interface
    return (
        <div className="App">
            <header className="App-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Hotel Management System</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px'}}>
                    {user && <span style={{ fontSize: '0.9rem' }}>Welcome, {user.email || user.phone || 'User'}!</span>}
                    <button onClick={handleLogout} title="Logout" style={logoutButtonStyle}>
                        <FaSignOutAlt /> Logout
                    </button>
                </div>
            </header>

            <main className="App-main">
                {/* Pass token to components needing authentication */}
                <Dashboard refreshTrigger={refreshKey} token={token} />
                <CheckInForm onCheckInSuccess={handleCheckInSuccess} token={token} />
            </main>

            <section className="App-reports">
                <DownloadReports token={token} />
            </section>
        </div>
    );
}

// Simple style for logout button (can move to App.css)
const logoutButtonStyle = {
     backgroundColor: 'var(--danger-color)',
     color: 'white',
     padding: '8px 15px',
     border: 'none',
     borderRadius: '6px',
     cursor: 'pointer',
     fontSize: '0.9rem',
     fontWeight: '500',
     display: 'inline-flex',
     alignItems: 'center',
     gap: '5px'
};

export default App;