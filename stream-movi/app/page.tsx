'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function getInitialAccount(): boolean {
  if (typeof window === 'undefined') return false;
  const account = localStorage.getItem('movieStreamingAccount');
  return !!account;
}

export default function Home() {
  const router = useRouter();
  // eslint-disable-next-line react/hook-use-state
  const [hasAccount] = useState(getInitialAccount);
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (hasAccount) {
      router.push('/landing');
    }
  }, [hasAccount, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (isRegistering) {
      // Check if passwords match
      if (password !== confirmPassword) {
        setPasswordError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setPasswordError('Password must be at least 6 characters');
        return;
      }
      
      // Create new account
      const account = {
        userName,
        email,
        password,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('movieStreamingAccount', JSON.stringify(account));
    } else {
      // For login, verify credentials - can sign in with username OR email
      const storedAccount = localStorage.getItem('movieStreamingAccount');
      if (storedAccount) {
        const account = JSON.parse(storedAccount);
        // Check if username OR email matches and password matches
        const identifier = userName || email;
        if ((account.userName === identifier || account.email === identifier) && account.password === password) {
          router.push('/landing');
          return;
        } else {
          setPasswordError('Invalid username/email or password');
          return;
        }
      }
      // If no account exists, create one with provided credentials
      const account = {
        userName: userName || 'Guest',
        email: email || '',
        password,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('movieStreamingAccount', JSON.stringify(account));
    }
    
    router.push('/landing');
  };

  if (hasAccount) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen gap-4 md:gap-6 p-4 bg-[var(--bg-primary)]">      
     
     <div className="flex justify-center mb-6">
          <img src="/logo/KLTR.png" alt="Logo" className="h-8 md:h-10" />
        </div>
      <div className="p-6 md:p-8 rounded-[var(--radius-lg)] shadow-md w-full max-w-md" style={{ backgroundColor: 'var(--surface-default)', border: '1px solid var(--border-subtle)' }}>
      {/* add logo here */}

       
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isRegistering ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your username"
                  required={isRegistering}
                  className="w-full px-4 py-2 border rounded-sm focus:outline-none focus:ring-2" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--border-strong)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required={isRegistering}
                  className="w-full px-4 py-2 border rounded-sm focus:outline-none focus:ring-2" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--border-strong)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">Username / Email</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your username or email"
                required
                className="w-full px-4 py-2 border rounded-sm focus:outline-none focus:ring-2" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--border-strong)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
              />
            </div>
          )}
          
          

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full px-4 py-2 border rounded-sm focus:outline-none focus:ring-2" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--border-strong)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
            />
          </div>

          {isRegistering && (
            <div>
              <label className="block text-sm font-medium mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required={isRegistering}
                className="w-full px-4 py-2 border rounded-sm focus:outline-none focus:ring-2" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--border-strong)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
              />
            </div>
          )}

          {!isRegistering && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded" style={{ accentColor: 'var(--focus-ring)' }}
              />
              <label htmlFor="rememberMe" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Remember me
              </label>
            </div>
          )}

          {passwordError && (
            <div className="text-sm" style={{ color: 'var(--error)' }}>{passwordError}</div>
          )}

          <button
            type="submit"
            className="w-full px-4 py-3 rounded-[var(--radius-md)] font-bold transition-colors"
            style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
          >
            {isRegistering ? 'Create Account' : 'Sign In'}
          </button>

          <div className="relative flex items-center gap-2">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }}></div>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }}></div>
          </div>

          <button
            type="button"
            onClick={() => {
              // Simulate Google OAuth sign in
              const googleUser = {
                userName: 'Google User',
                email: 'user@gmail.com',
                password: 'google-oauth',
                createdAt: new Date().toISOString(),
                provider: 'google'
              };
              localStorage.setItem('movieStreamingAccount', JSON.stringify(googleUser));
              router.push('/landing');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[var(--radius-md)] font-medium transition-colors"
            style={{ backgroundColor: 'var(--text-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-inverse)' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </form>

        <div className="mt-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          {isRegistering ? (
            <>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setIsRegistering(false);
                  setPasswordError('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="hover:underline" style={{ color: 'var(--link-default)' }}
                onMouseEnter={(e) => e.target.style.color = 'var(--link-hover)'}
                onMouseLeave={(e) => e.target.style.color = 'var(--link-default)'}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don&apos;t have an account?{' '}
              <button
                onClick={() => {
                  setIsRegistering(true);
                  setPasswordError('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="hover:underline" style={{ color: 'var(--link-default)' }}
                onMouseEnter={(e) => e.target.style.color = 'var(--link-hover)'}
                onMouseLeave={(e) => e.target.style.color = 'var(--link-default)'}
              >
                Create Account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
