import { useState } from 'react';

const AuthForm = ({ mode, onSubmit, disabled }) => {
  const isSignUp = mode === 'signup';
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
  });

  const updateField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>{isSignUp ? 'Create Account' : 'Sign In'}</h2>
      {isSignUp && (
        <label>
          Full name
          <input
            name="fullName"
            type="text"
            autoComplete="name"
            value={form.fullName}
            onChange={updateField}
            required
          />
        </label>
      )}
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={updateField}
          required
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          value={form.password}
          onChange={updateField}
          minLength="6"
          required
        />
      </label>
      <button type="submit" disabled={disabled}>
        {disabled ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
      </button>
    </form>
  );
};

export default AuthForm;
