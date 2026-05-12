import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function SignupSuccessPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
            <CardHeader>
            <CardTitle className="text-2xl font-bold">Success!</CardTitle>
            <CardDescription>Your account has been created and you have joined the organization.</CardDescription>
            </CardHeader>
            <CardContent>
            <p className="mb-4">Please log in to continue to the dashboard.</p>
            <Button asChild className="w-full">
                <a href="/api/auth/login?returnTo=/reports">Log In</a>
            </Button>
            </CardContent>
        </Card>
    </div>
  );
}