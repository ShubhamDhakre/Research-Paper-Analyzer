import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';

export function Register({ onNavigateLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [institution, setInstitution] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    try {
      await register(name, email, password, institution);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🔬</div>
          <h1>Create Scholar Account</h1>
          <p>Join the AI Research Assistant Platform</p>
        </div>

        {error && <Alert type="danger">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <Input
            label="Full Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dr. Alan Turing"
          />

          <Input
            label="Academic / Institutional Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="a.turing@cambridge.ac.uk"
          />

          <Input
            label="Institution / Department"
            placeholder="e.g. Dept of Computer Science & AI"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
          />

          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
          />

          <Input
            label="Confirm Password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat your password"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            Create Research Account
          </Button>
        </form>

        <div className="auth-footer">
          Already registered?{' '}
          <a
            href="#login"
            onClick={(e) => {
              e.preventDefault();
              onNavigateLogin();
            }}
          >
            Sign In here
          </a>
        </div>
      </div>
    </div>
  );
}

export default Register;
