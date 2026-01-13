import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { DynamicBorderCard } from '@/components/ui/dynamic-border-card';
import { toast } from '@/hooks/use-toast';

export default function Auth() {
  const { user, signIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [failedAttempts, setFailedAttempts] = useState(() => {
    const stored = localStorage.getItem('auth_failed_attempts');
    return stored ? parseInt(stored, 10) : 0;
  });
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => {
    const stored = localStorage.getItem('auth_lockout_until');
    if (stored) {
      const lockoutTime = parseInt(stored, 10);
      if (Date.now() >= lockoutTime) {
        localStorage.removeItem('auth_lockout_until');
        localStorage.removeItem('auth_failed_attempts');
        return null;
      }
      return lockoutTime;
    }
    return null;
  });

  // Persist lockout state to localStorage
  useEffect(() => {
    if (lockoutUntil) {
      localStorage.setItem('auth_lockout_until', lockoutUntil.toString());
      localStorage.setItem('auth_failed_attempts', failedAttempts.toString());
    } else {
      localStorage.removeItem('auth_lockout_until');
      localStorage.removeItem('auth_failed_attempts');
    }
  }, [lockoutUntil, failedAttempts]);

  // Check lockout on mount and set up timer
  useEffect(() => {
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const timer = setTimeout(() => {
        setLockoutUntil(null);
        setFailedAttempts(0);
      }, lockoutUntil - Date.now());
      return () => clearTimeout(timer);
    }
  }, [lockoutUntil]);

  // Redirect if already authenticated
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!validateEmail(email)) {
      errors.email = "Please enter a valid email address";
    }
    
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check lockout
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setFormErrors({ general: `Too many attempts. Try again in ${remainingSeconds} seconds.` });
      return;
    }

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setFormErrors({});

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        // Generic error message for security
        setFormErrors({ general: "Invalid email or password" });
        
        // Track failed attempts
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        
        // Lock out after 5 attempts
        if (newAttempts >= 5) {
          const lockoutTime = Date.now() + 5 * 60 * 1000; // 5 minutes
          setLockoutUntil(lockoutTime);
          setFormErrors({ general: "Too many attempts. Try again in 5 minutes." });
        }
      } else {
        // Reset on success
        setFailedAttempts(0);
        setLockoutUntil(null);
      }
    } finally {
      setIsLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center auth-page-background p-4 md:p-6 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <DynamicBorderCard className="w-full max-w-[440px]">
        <CardHeader className="text-center space-y-2 pt-2 pb-2 px-6 md:px-8">
          <div className="flex justify-center -mx-4">
            <Logo variant="login" size="sm" />
          </div>
          <div>
            <CardTitle className="text-2xl font-luxury" style={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 600, fontStyle: 'normal' }}>
              Welcome Back
            </CardTitle>
            <CardDescription className="opacity-70">
              Sign in to your account to continue
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="px-6 md:px-8 pb-10">
          <form onSubmit={handleSubmit} className="space-y-5" aria-live="polite">
            {/* General error message */}
            {formErrors.general && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm" role="alert">
                {formErrors.general}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formErrors.email) setFormErrors({ ...formErrors, email: undefined });
                  }}
                  className="pl-9"
                  autoComplete="email"
                  aria-invalid={!!formErrors.email}
                  aria-describedby={formErrors.email ? "email-error" : undefined}
                />
              </div>
              {formErrors.email && (
                <p id="email-error" className="text-sm text-destructive" role="alert">
                  {formErrors.email}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formErrors.password) setFormErrors({ ...formErrors, password: undefined });
                  }}
                  className="pl-9 pr-10"
                  autoComplete="current-password"
                  aria-invalid={!!formErrors.password}
                  aria-describedby={formErrors.password ? "password-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formErrors.password && (
                <p id="password-error" className="text-sm text-destructive" role="alert">
                  {formErrors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-sm cursor-pointer">
                  Remember me
                </Label>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Password recovery is managed by the owner. Please contact admin for assistance.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Button
              type="submit"
              className="w-full premium-button"
              variant="premium"
              disabled={isLoading || (lockoutUntil !== null && Date.now() < lockoutUntil)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </DynamicBorderCard>
    </div>
  );
}