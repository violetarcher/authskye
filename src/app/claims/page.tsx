'use client';

import { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { ClaimSubmissionForm } from '@/components/claims/claim-submission-form';
import { ClaimsList } from '@/components/claims/claims-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList } from 'lucide-react';

export default function ClaimsPage() {
  const { user } = useUser();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleClaimSubmitted = () => {
    // Trigger re-render of claims list by changing the key
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-4">
      <header className="mb-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="w-8 h-8" />
          Claims Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submit and track your out-of-network reimbursement claims
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left column - Claim Submission */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Submit New Claim</CardTitle>
            <CardDescription className="text-xs">
              Complete the form below and approve via mobile push notification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClaimSubmissionForm user={user} onClaimSubmitted={handleClaimSubmitted} />
          </CardContent>
        </Card>

        {/* Right column - Claims List */}
        <div key={refreshTrigger}>
          <ClaimsList userId={user?.sub || undefined} />
        </div>
      </div>
    </div>
  );
}
