// frontend/src/components/Signup.js
import React, { useState } from 'react';

function Signup({ onSwitchToLogin }) {
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Frontend Validation
        if (!email && !phone) {
            setError('Please provide either an email or a phone number.');
            return;
        }
         if (!password) {
            setError('Please enter a password.');
            return;
        }
         if (password.length < 6) {
             setError('Password must be at least 6 characters long.');
             return;
         }

        setLoading(true);
        console.log("Signup attempt with:", { email, phone }); // Debug log

        const apiUrl = 'http://localhost:5001/api/auth/register';

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                     email: email || null, // Send null if empty string
                     phone: phone || null, // Send null if empty string
                     password
                 }),
            });

            const data = await response.json(); // Try parsing JSON even for errors
            console.log("Signup response status:", response.status, "Data:", data); // Debug log

            if (response.ok) { // Status 201 Created usually
                setSuccess(data.message || 'Signup successful! Please log in.');
                console.log("Signup successful via fetch");
                // Clear form on success
                setEmail('');
                setPhone('');
                setPassword('');
                // Optional: Automatically switch to login after a delay
                // setTimeout(() => onSwitchToLogin(), 2500);
            } else {
                // Use error message from backend response if available
                setError(data.message || `Signup failed with status: ${response.status}`);
                 console.error("Signup failed:", data.message || `Status ${response.status}`);
            }
        } catch (err) {
             // Catch network errors or issues parsing JSON
            console.error("Signup fetch/parse error:", err);
            setError('Signup request failed. Check connection or server status.');
        } finally {
             // *** CRITICAL: Ensure loading state is always turned off ***
            setLoading(false);
        }
    };

    return (
        <div className="signup-box" style={styles.box}>
            <h2 style={styles.heading}>Sign Up</h2>
            {error && <p style={styles.error}>{error}</p>}
            {success && <p style={styles.success}>{success}</p>}
            <form onSubmit={handleSubmit} style={styles.form}>
                <p style={styles.infoText}>Please provide either an email or phone number (or both).</p>
                <div style={styles.inputGroup}>
                    <label htmlFor="signup-email" style={styles.label}>Email Address:</label>
                    <input
                        type="email"
                        id="signup-email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        style={styles.input}
                        disabled={loading}
                    />
                </div>
                 <div style={styles.inputGroup}>
                    <label htmlFor="signup-phone" style={styles.label}>Phone Number:</label>
                    <input
                        type="tel"
                        id="signup-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g., 1234567890"
                        style={styles.input}
                        disabled={loading}
                    />
                </div>
                <div style={styles.inputGroup}>
                    <label htmlFor="signup-password" style={styles.label}>Password (min 6 chars):</label>
                    <input
                        type="password"
                        id="signup-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength="6"
                        style={styles.input}
                        disabled={loading}
                    />
                </div>
                <button type="submit" disabled={loading} style={styles.button}>
                    {loading ? 'Signing up...' : 'Sign Up'}
                </button>
            </form>
             <p style={styles.switchText}>
                Already have an account?{' '}
                <button onClick={onSwitchToLogin} style={styles.switchButton} disabled={loading}>
                    Log In
                </button>
            </p>
        </div>
    );
}

// Add or reference styles from App.css or Login component
const styles = {
    box: { padding: '40px', backgroundColor: 'var(--card-background)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)', maxWidth: '450px', width: '100%', textAlign: 'center', margin: 'auto' },
    heading: { marginBottom: '20px', color: 'var(--dark-color)' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    inputGroup: { textAlign: 'left', marginBottom: '5px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: '500', color: 'var(--secondary-color)', fontSize: '0.9rem' },
    input: { width: '100%', padding: '12px 15px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' },
    button: { backgroundColor: 'var(--success-color)', color: 'white', padding: '12px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1rem', fontWeight: '500', transition: 'background-color 0.2s ease', marginTop: '10px' },
    error: { color: '#721c24', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.9rem', wordWrap: 'break-word' },
    success: { color: '#155724', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.9rem' },
    infoText: { fontSize: '0.85rem', color: 'var(--secondary-color)', marginBottom: '15px', marginTop: '-5px', textAlign: 'left' },
    switchText: { marginTop: '25px', fontSize: '0.9rem' },
    switchButton: { background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: '0.9rem' },
};

export default Signup;