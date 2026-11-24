import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';

export function Login({ onNavigateRegister }) {
  const [email, setEmail] = useState('researcher@lab.edu');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">📚</div>
          <h1>Welcome Back</h1>
          <p>Sign in to your Academic Research Assistant</p>
        </div>

        {error && <Alert type="danger">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <Input
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="scholar@university.edu"
          />

          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-100"
            style={{ width: '100%', marginTop: '1rem' }}
          >
            Sign In to Research Workspace
          </Button>
        </form>

        <div className="auth-footer">
          Don't have an academic account?{' '}
          <a
            href="#register"
            onClick={(e) => {
              e.preventDefault();
              onNavigateRegister();
            }}
          >
            Create an Account
          </a>
        </div>
      </div>
    </div>
  );
}

export default Login;
