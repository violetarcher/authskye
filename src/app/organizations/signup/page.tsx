import { SignupForm } from '@/components/organization/signup-form';

export const metadata = {
  title: 'Create Your Organization | EnergyCo',
  description: 'Join EnergyCo to manage power generation and optimize grid operations.',
};

export default function OrganizationSignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Welcome to EnergyCo</h1>
          <p className="text-lg text-muted-foreground">
            Start managing your energy operations in minutes
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
