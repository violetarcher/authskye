'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { organizationSignupSchema } from '@/lib/validations';
import { z } from 'zod';

type SignupFormData = z.infer<typeof organizationSignupSchema>;

export function SignupForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<SignupFormData>({
    organizationName: '',
    adminEmail: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = (field: keyof SignupFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError(null);

    console.log('🔍 Submitting form data:', formData);

    // Client-side validation
    const validation = organizationSignupSchema.safeParse(formData);

    console.log('✅ Validation result:', validation);

    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error);
      const fieldErrors: Record<string, string> = {};
      if (validation.error?.issues) {
        validation.error.issues.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message;
          }
        });
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('📤 Sending request to API...');
      const response = await fetch('/api/organizations/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });

      console.log('📡 Response status:', response.status);

      const data = await response.json();
      console.log('📥 Response data:', data);

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create organization');
      }

      // Success! Show success message briefly, then redirect
      setSubmitSuccess(true);

      console.log('✅ Organization created successfully:', data.organizationId);

      // Redirect to Auth0 invitation acceptance page
      setTimeout(() => {
        const invitationUrl = `/api/auth/login?invitation=${data.invitationTicket}&organization=${data.organizationId}&returnTo=/organization-management`;
        console.log('🔄 Redirecting to:', invitationUrl);
        window.location.href = invitationUrl;
      }, 2000);
    } catch (error: any) {
      console.error('❌ Signup error:', error);
      setSubmitError(error.message || 'An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-center text-2xl">Organization Created!</CardTitle>
          <CardDescription className="text-center">
            Your organization has been created successfully. Redirecting to complete your registration...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Register Your Organization</CardTitle>
        <CardDescription>
          Join Authskye to manage your team, collaborate on projects, and control access securely.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="organizationName">
              Organization Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="organizationName"
              placeholder="Acme Corporation"
              value={formData.organizationName}
              onChange={handleChange('organizationName')}
              disabled={isSubmitting}
              className={errors.organizationName ? 'border-red-500' : ''}
            />
            {errors.organizationName && (
              <p className="text-sm text-red-500">{errors.organizationName}</p>
            )}
          </div>

          {/* Admin Email */}
          <div className="space-y-2">
            <Label htmlFor="adminEmail">
              Admin Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="adminEmail"
              type="email"
              placeholder="admin@acme.com"
              value={formData.adminEmail}
              onChange={handleChange('adminEmail')}
              disabled={isSubmitting}
              className={errors.adminEmail ? 'border-red-500' : ''}
            />
            {errors.adminEmail && (
              <p className="text-sm text-red-500">{errors.adminEmail}</p>
            )}
            <p className="text-xs text-muted-foreground">
              You'll receive an invitation email to complete your registration.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Organization...
              </>
            ) : (
              'Create Organization'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
