'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Smartphone, CheckCircle2, ExternalLink, Shield } from 'lucide-react';

interface GuardianEnrollmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnrollmentComplete: () => void;
}

export function GuardianEnrollmentModal({
  open,
  onOpenChange,
  onEnrollmentComplete,
}: GuardianEnrollmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [enrollmentOpened, setEnrollmentOpened] = useState(false);

  // Generate enrollment ticket when modal opens
  useEffect(() => {
    if (open && !ticketUrl && !loading) {
      generateEnrollmentTicket();
    }
  }, [open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setTicketUrl(null);
      setEnrolled(false);
      setError(null);
      setEnrollmentOpened(false);
    }
  }, [open]);

  // Poll for enrollment status after user opens enrollment link
  useEffect(() => {
    if (!open || !enrollmentOpened || enrolled) return;

    const interval = setInterval(checkEnrollmentStatus, 2000);
    return () => clearInterval(interval);
  }, [open, enrollmentOpened, enrolled]);

  const generateEnrollmentTicket = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/guardian/enroll', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create enrollment');
      }

      const data = await response.json();
      console.log('📱 Guardian enrollment ticket:', data);
      setTicketUrl(data.ticket_url);
    } catch (err: any) {
      console.error('❌ Failed to generate enrollment ticket:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollmentStatus = async () => {
    if (checkingEnrollment) return;
    setCheckingEnrollment(true);

    try {
      const response = await fetch('/api/guardian/check-enrollment');
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Enrollment check response:', data);
        if (data.enrolled) {
          setEnrolled(true);
          setTimeout(() => {
            onEnrollmentComplete();
            onOpenChange(false);
          }, 1500);
        }
      }
    } catch (err) {
      // Silently ignore polling errors
    } finally {
      setCheckingEnrollment(false);
    }
  };

  const openEnrollment = () => {
    if (ticketUrl) {
      window.open(ticketUrl, '_blank');
      setEnrollmentOpened(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Set Up Guardian Push
          </DialogTitle>
          <DialogDescription>
            Enable push notifications to approve payment requests securely from your phone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Preparing enrollment...</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {enrolled && (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <p className="text-lg font-medium text-green-700">Guardian Enrolled!</p>
              <p className="text-sm text-muted-foreground">You can now receive push notifications.</p>
            </div>
          )}

          {!loading && !enrolled && ticketUrl && (
            <div className="w-full space-y-4">
              {/* Instructions */}
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Quick Setup
                </p>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary">1.</span>
                    <span>Download <strong>Auth0 Guardian</strong> app on your phone</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary">2.</span>
                    <span>Click the button below to open enrollment</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary">3.</span>
                    <span>Scan the QR code shown with the Guardian app</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary">4.</span>
                    <span>Approve the enrollment in Guardian</span>
                  </li>
                </ol>
              </div>

              {/* Enroll Button */}
              <Button
                onClick={openEnrollment}
                className="w-full gap-2 bg-primary hover:bg-primary/90"
                size="lg"
              >
                <ExternalLink className="h-4 w-4" />
                Open Guardian Enrollment
              </Button>

              {/* Status after opening */}
              {enrollmentOpened && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Waiting for you to complete enrollment...
                </div>
              )}

              <p className="text-xs text-center text-muted-foreground">
                A new tab will open. Complete the enrollment there, then return here.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
