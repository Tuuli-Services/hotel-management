// frontend/src/components/Login.js
import React, { useState } from 'react';

function Login({ onLoginSuccess, onSwitchToSignup }) {
    const [identifier, setIdentifier] = useState(''); // Accepts email or phone
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Clear previous errors
        setLoading(true); // Set loading state

        console.log("Login attempt with identifier:", identifier); // Debug log

        const apiUrl = 'http://localhost:5001/api/auth/login';

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password }),
            });

            // Try to parse JSON regardless of status code for potential error messages
            const data = await response.json();
            console.log("Login response status:", response.status, "Data:", data); // Debug log

            if (response.ok) { // Status 200-299
                console.log("Login successful via fetch");
                onLoginSuccess(data.accessToken, data.user); // Pass token and user up
            } else {
                // Use error message from backend response if available
                setError(data.message || `Login failed with status: ${response.status}`);
                console.error("Login failed:", data.message || `Status ${response.status}`);
            }
        } catch (err) {
            // Catch network errors or issues parsing JSON
            console.error("Login fetch/parse error:", err);
            setError('Login request failed. Check connection or server status.');
        } finally {
            // *** CRITICAL: Ensure loading state is always turned off ***
            setLoading(false);
        }
    };

    return (
        <div className="login-box" style={styles.box}>
            <h2 style={styles.heading}>Hotel System Login</h2>
            {error && <p style={styles.error}>{error}</p>}
            <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.inputGroup}>
                    <label htmlFor="identifier" style={styles.label}>Email or Phone Number:</label>
                    <input
                        type="text"
                        id="identifier"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                        placeholder="Enter your email or phone"
                        style={styles.input}
                        disabled={loading} // Disable input while loading
                    />
                </div>
                <div style={styles.inputGroup}>
                    <label htmlFor="password" style={styles.label}>Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={styles.input}
                        disabled={loading} // Disable input while loading
                    />
                </div>
                <button type="submit" disabled={loading} style={styles.button}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
            <p style={styles.switchText}>
                Don't have an account?{' '}
                <button onClick={onSwitchToSignup} style={styles.switchButton} disabled={loading}>
                    Sign Up
                </button>
            </p>
            {/* Removed hint for production, keep for dev if needed */}
            {/* <p style={styles.hint}>Hint: Use reception@hotel.com / password123</p> */}
        </div>
    );
}

// Add or reference styles from App.css or previous component
const styles = {
    box: { padding: '40px', backgroundColor: 'var(--card-background)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)', maxWidth: '450px', width: '100%', textAlign: 'center', margin: 'auto' },
    heading: { marginBottom: '30px', color: 'var(--dark-color)' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    inputGroup: { textAlign: 'left' },
    label: { display: 'block', marginBottom: '5px', fontWeight: '500', color: 'var(--secondary-color)' },
    input: { width: '100%', padding: '12px 15px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' },
    button: { backgroundColor: 'var(--primary-color)', color: 'white', padding: '12px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem', fontWeight: '500', transition: 'background-color 0.2s ease', marginTop: '10px' },
    error: { color: '#721c24', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.9rem', wordWrap: 'break-word' },
    switchText: { marginTop: '25px', fontSize: '0.9rem' },
    switchButton: { background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: '0.9rem' },
    // hint: { marginTop: '20px', fontSize: '0.85rem', color: 'var(--secondary-color)' },
};

export default Login;