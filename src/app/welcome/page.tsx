import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, LogIn } from 'lucide-react';

export const metadata = {
  title: 'Welcome | SaaS Consumer',
  description: 'Sign in or create your organization',
};

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-3">
            Welcome to SaaS Consumer
          </h1>
          <p className="text-lg text-muted-foreground">
        {/* //description */}
          </p>
        </div>

        {/* Choice Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Sign In Card */}
          <Card className="hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <LogIn className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-3xl mb-2">Sign In or Register</CardTitle>
              <CardDescription className="text-base">
                Access your account
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <Button asChild size="lg" className="w-full h-12 text-base">
                <Link href="/api/auth/login">
                  Sign In or Register
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Create Organization Card */}
          <Card className="hover:shadow-lg transition-shadow border-2 hover:border-teal-500/50">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mb-6">
                <Building2 className="h-10 w-10 text-teal-600" />
              </div>
              <CardTitle className="text-3xl mb-2">Create Organization</CardTitle>
              <CardDescription className="text-base">
                Set up a new organization
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <Button asChild size="lg" variant="outline" className="w-full h-12 text-base border-teal-600 text-teal-600 hover:bg-teal-50">
                <Link href="/organizations/signup">
                  Get Started
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Help Text */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>
            Questions?{' '}
            <a href="#" className="text-primary hover:underline font-medium">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
