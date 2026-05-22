import { SignupForm } from '@/components/organization/signup-form';

export const metadata = {
  title: 'Create Your Organization | Authskye',
  description: 'Join Authskye to set up your workspace in the cloud.',
};

export default function OrganizationSignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Welcome to Authskye</h1>
          <p className="text-lg text-muted-foreground">
            Set up your workspace in the cloud in minutes
          </p>
        </div>

        {/* Signup Form */}
        <SignupForm />

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>
            Already have an account?{' '}
            <a href="/api/auth/login" className="text-primary hover:underline font-medium">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
