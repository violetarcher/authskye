'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Upload,
  DollarSign,
  Calendar,
  User,
  Building2,
  CreditCard,
  Shield,
  CheckCircle2,
  Loader2,
  Smartphone,
  AlertTriangle,
  Lock,
  Wand2,
  FileText,
  Package
} from 'lucide-react';
import { GuardianEnrollmentModal } from './guardian-enrollment-modal';

interface BillingFormProps {
  user: any;
  onPaymentSubmitted?: () => void;
}

interface CIBAStatus {
  status: 'idle' | 'pending' | 'approved' | 'denied' | 'expired';
  authReqId?: string;
  message?: string;
}

// Demo data sets for autofill - insurance claim scenarios
const DEMO_DATA_SETS = [
  {
    paymentDate: new Date().toISOString().split('T')[0],
    itemName: 'Dr. Sarah Martinez, MD — Primary Care',
    invoiceNumber: 'CLM-2024-001',
    billingCycle: 'Z00.00',
    amount: '185.00',
    description: 'Annual wellness exam and preventive care screening. CPT: 99396. Network: In-Network.',
    routingNumber: '121000248',
    accountNumber: '9876543210',
    accountNumberConfirm: '9876543210',
  },
  {
    paymentDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    itemName: 'Pacific Heart & Vascular — Cardiology',
    invoiceNumber: 'CLM-2024-002',
    billingCycle: 'I10',
    amount: '320.00',
    description: 'Cardiology consultation and resting ECG. CPT: 99243, 93000. Network: In-Network.',
    routingNumber: '026009593',
    accountNumber: '5551234567',
    accountNumberConfirm: '5551234567',
  },
  {
    paymentDate: new Date(Date.now() - 172800000).toISOString().split('T')[0],
    itemName: 'CareNow Urgent Care — Urgent Care',
    invoiceNumber: 'CLM-2024-003',
    billingCycle: 'J06.9',
    amount: '215.00',
    description: 'Urgent care visit, rapid strep test, and antibiotic prescription. CPT: 99213. Network: In-Network.',
    routingNumber: '071000013',
    accountNumber: '8882229999',
    accountNumberConfirm: '8882229999',
  },
  {
    paymentDate: new Date(Date.now() - 259200000).toISOString().split('T')[0],
    itemName: 'Quest Diagnostics — Laboratory',
    invoiceNumber: 'CLM-2024-004',
    billingCycle: 'E11.65',
    amount: '142.00',
    description: 'Comprehensive metabolic panel and HbA1c testing. CPT: 80053, 83036. Network: In-Network.',
    routingNumber: '111000025',
    accountNumber: '7773331111',
    accountNumberConfirm: '7773331111',
  },
];

export function BillingForm({ user, onPaymentSubmitted }: BillingFormProps) {
  const [loading, setLoading] = useState(false);
  const [cibaStatus, setCibaStatus] = useState<CIBAStatus>({ status: 'idle' });
  const [currentDemoIndex, setCurrentDemoIndex] = useState(0);
  const [guardianEnrolled, setGuardianEnrolled] = useState<boolean | null>(null);
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [formData, setFormData] = useState({
    paymentDate: '',
    itemName: '',
    invoiceNumber: '',
    billingCycle: '',
    amount: '',
    description: '',
    routingNumber: '',
    accountNumber: '',
    accountNumberConfirm: '',
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Check Guardian enrollment status on mount
  useEffect(() => {
    checkGuardianEnrollment();
  }, []);

  const checkGuardianEnrollment = async () => {
    setCheckingEnrollment(true);
    try {
      const response = await fetch('/api/guardian/check-enrollment');
      if (response.ok) {
        const data = await response.json();
        setGuardianEnrolled(data.enrolled);
        console.log('Guardian enrolled:', data.enrolled);
      }
    } catch (error) {
      console.error('Failed to check Guardian enrollment:', error);
      setGuardianEnrolled(false);
    } finally {
      setCheckingEnrollment(false);
    }
  };

  const handleEnrollmentComplete = () => {
    setGuardianEnrolled(true);
    toast.success('Guardian enrolled successfully!', {
      description: 'You can now approve claim submissions via push notification.',
    });
  };

  // Autofill demo data - cycles through different payment scenarios
  const fillDemoData = () => {
    const demoData = DEMO_DATA_SETS[currentDemoIndex];
    setFormData({
      paymentDate: demoData.paymentDate,
      itemName: demoData.itemName,
      invoiceNumber: demoData.invoiceNumber,
      billingCycle: demoData.billingCycle,
      amount: demoData.amount,
      description: demoData.description,
      routingNumber: demoData.routingNumber,
      accountNumber: demoData.accountNumber,
      accountNumberConfirm: demoData.accountNumberConfirm,
    });

    // Cycle to next demo data set
    setCurrentDemoIndex((currentDemoIndex + 1) % DEMO_DATA_SETS.length);

    // Create a mock PDF receipt/invoice
    const mockPdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj
4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
5 0 obj
<<
/Length 200
>>
stream
BT
/F1 24 Tf
100 700 Td
(BLUECREST HEALTH - SUPERBILL) Tj
/F1 12 Tf
100 650 Td
(Provider: ${demoData.itemName}) Tj
100 630 Td
(Member: ${user?.name || 'Demo Member'}) Tj
100 610 Td
(Service Date: ${new Date(demoData.paymentDate).toLocaleDateString()}) Tj
100 590 Td
(Diagnosis Code: ${demoData.billingCycle}) Tj
100 570 Td
(Claim Amount: $${demoData.amount}) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
0000000361 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
612
%%EOF`;

    const blob = new Blob([mockPdfContent], { type: 'application/pdf' });
    const file = new File([blob], `invoice_${demoData.invoiceNumber.toLowerCase()}.pdf`, { type: 'application/pdf' });
    setReceiptFile(file);

    toast.success('Demo claim filled!', {
      description: `${demoData.itemName} — $${demoData.amount}`,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf' && file.size <= 10 * 1024 * 1024) {
        setReceiptFile(file);
        toast.success('Receipt uploaded', {
          description: `File: ${file.name}`,
        });
      } else {
        toast.error('Invalid file', {
          description: 'Please upload a PDF file under 10MB',
        });
      }
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = (): boolean => {
    if (!formData.paymentDate || !formData.itemName || !formData.amount) {
      toast.error('Missing required fields', {
        description: 'Please fill out all required fields',
      });
      return false;
    }

    if (!receiptFile) {
      toast.error('Invoice/receipt required', {
        description: 'Please upload the invoice or receipt (PDF)',
      });
      return false;
    }

    if (!formData.routingNumber || formData.routingNumber.length !== 9) {
      toast.error('Invalid routing number', {
        description: 'Routing number must be 9 digits',
      });
      return false;
    }

    if (!formData.accountNumber || formData.accountNumber.length < 4) {
      toast.error('Invalid account number', {
        description: 'Please enter a valid account number',
      });
      return false;
    }

    if (formData.accountNumber !== formData.accountNumberConfirm) {
      toast.error('Account numbers do not match', {
        description: 'Please confirm your account number',
      });
      return false;
    }

    return true;
  };

  const initiateCIBA = async (): Promise<boolean> => {
    try {
      setCibaStatus({ status: 'pending', message: 'Initiating authentication request...' });

      console.log('Initiating CIBA flow for payment');

      // Step 1: Initiate CIBA authentication request
      const cibaResponse = await fetch('/api/ciba/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'openid profile email',
          binding_message: `Approve claim: ${formData.amount} USD`,
        }),
      });

      if (!cibaResponse.ok) {
        const error = await cibaResponse.json();
        throw new Error(error.message || 'Failed to initiate CIBA');
      }

      const cibaData = await cibaResponse.json();
      const { auth_req_id, expires_in } = cibaData;

      console.log('CIBA initiated:', { auth_req_id, expires_in });

      setCibaStatus({
        status: 'pending',
        authReqId: auth_req_id,
        message: 'Push notification sent to your mobile device',
      });

      // Step 2: Poll for CIBA result
      const pollResult = await pollCIBAStatus(auth_req_id, expires_in);

      if (pollResult.status === 'approved') {
        setCibaStatus({ status: 'approved', message: 'Authentication approved!' });
        return true;
      } else if (pollResult.status === 'denied') {
        setCibaStatus({ status: 'denied', message: 'Authentication denied' });
        toast.error('Authentication denied', {
          description: 'You denied the authentication request',
        });
        return false;
      } else {
        setCibaStatus({ status: 'expired', message: 'Authentication request expired' });
        toast.error('Authentication expired', {
          description: 'The authentication request expired',
        });
        return false;
      }
    } catch (error: any) {
      console.error('CIBA error:', error);
      setCibaStatus({ status: 'idle', message: error.message });
      toast.error('Authentication failed', {
        description: error.message || 'Failed to complete authentication',
      });
      return false;
    }
  };

  const pollCIBAStatus = async (
    authReqId: string,
    expiresIn: number
  ): Promise<{ status: 'approved' | 'denied' | 'expired' }> => {
    const startTime = Date.now();
    const maxDuration = Math.max(60000, expiresIn * 1000);
    const pollInterval = 5000;

    return new Promise((resolve) => {
      const poll = async () => {
        const elapsed = Date.now() - startTime;
        console.log(`Polling CIBA (${Math.floor(elapsed / 1000)}s elapsed)...`);

        if (elapsed > maxDuration) {
          console.log('Polling timeout reached');
          resolve({ status: 'expired' });
          return;
        }

        try {
          const response = await fetch('/api/ciba/poll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auth_req_id: authReqId }),
          });

          console.log('Poll HTTP status:', response.status);

          if (!response.ok && response.status >= 500) {
            console.warn('Server error, continuing to poll...');
            setTimeout(poll, pollInterval);
            return;
          }

          const data = await response.json();
          console.log('Poll data:', data);

          if (data.status === 'approved') {
            console.log('CIBA Approved!');
            resolve({ status: 'approved' });
          } else if (data.status === 'denied') {
            console.log('CIBA Denied');
            resolve({ status: 'denied' });
          } else if (data.status === 'expired') {
            console.log('CIBA Expired');
            resolve({ status: 'expired' });
          } else if (data.status === 'pending' || data.error === 'authorization_pending') {
            console.log('Still pending, polling again in 5 seconds...');
            setTimeout(poll, pollInterval);
          } else {
            console.warn('Unknown poll status, continuing:', data);
            setTimeout(poll, pollInterval);
          }
        } catch (error) {
          console.error('Poll fetch error:', error);
          setTimeout(poll, pollInterval);
        }
      };

      poll();
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Check Guardian enrollment before proceeding
    if (guardianEnrolled === null) {
      toast.info('Checking enrollment status...', {
        description: 'Please wait while we verify your Guardian setup.',
      });
      await checkGuardianEnrollment();
    }

    if (!guardianEnrolled) {
      setShowEnrollmentModal(true);
      return;
    }

    setLoading(true);

    try {
      // Step 1: Initiate CIBA authentication
      toast.info('Claim approval required', {
        description: 'Please approve the claim submission via Guardian app on your mobile device',
      });

      const cibaApproved = await initiateCIBA();

      if (!cibaApproved) {
        setLoading(false);
        return;
      }

      // Step 2: Submit payment after CIBA approval
      const formDataToSend = new FormData();
      formDataToSend.append('serviceDate', formData.paymentDate);
      formDataToSend.append('providerName', formData.itemName);
      formDataToSend.append('providerNPI', formData.invoiceNumber);
      formDataToSend.append('diagnosisCode', formData.billingCycle);
      formDataToSend.append('claimAmount', formData.amount);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('routingNumber', formData.routingNumber);
      formDataToSend.append('accountNumber', formData.accountNumber);
      if (receiptFile) {
        formDataToSend.append('superbill', receiptFile);
      }

      const response = await fetch('/api/billing/submit', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit payment');
      }

      const result = await response.json();

      toast.success('Claim submitted successfully!', {
        description: `Claim ID: ${result.claimId}`,
      });

      // Trigger transactions list refresh
      if (onPaymentSubmitted) {
        onPaymentSubmitted();
      }

      // Reset form
      setFormData({
        paymentDate: '',
        itemName: '',
        invoiceNumber: '',
        billingCycle: '',
        amount: '',
        description: '',
        routingNumber: '',
        accountNumber: '',
        accountNumberConfirm: '',
      });
      setReceiptFile(null);
      setCibaStatus({ status: 'idle' });
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error('Submission failed', {
        description: error.message || 'Failed to submit claim',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Autofill Demo Data Button */}
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={fillDemoData}
          variant="outline"
          size="sm"
          className="gap-1 h-7 text-xs"
        >
          <Wand2 className="w-3 h-3" />
          Fill Demo ({currentDemoIndex + 1}/4)
        </Button>
      </div>

      {/* Guardian Enrollment Status */}
      {guardianEnrolled === false && cibaStatus.status === 'idle' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-xs font-medium text-amber-800">
              Push approval not set up — required for claim submission
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 text-xs border-amber-400 text-amber-700 hover:bg-amber-100"
            onClick={() => setShowEnrollmentModal(true)}
          >
            Set Up Now
          </Button>
        </div>
      )}

      {guardianEnrolled === true && cibaStatus.status === 'idle' && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-xs font-medium text-green-800">
            Push approval ready — claim submission enabled
          </span>
        </div>
      )}

      {/* CIBA Status Alert - Compact */}
      {cibaStatus.status !== 'idle' && (
        <div className={`rounded-lg border px-3 py-2 flex items-center gap-2 ${
            cibaStatus.status === 'approved'
              ? 'bg-green-50 border-green-200'
              : cibaStatus.status === 'pending'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-orange-50 border-orange-200'
          }`}
        >
          {cibaStatus.status === 'pending' && (
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
          )}
          {cibaStatus.status === 'approved' && (
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          )}
          {(cibaStatus.status === 'denied' || cibaStatus.status === 'expired') && (
            <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
          )}
          <span className="text-xs font-medium">
            {cibaStatus.status === 'pending' && 'Waiting for claim approval on Guardian app'}
            {cibaStatus.status === 'approved' && 'Approved! Submitting claim...'}
            {cibaStatus.status === 'denied' && 'Claim submission denied'}
            {cibaStatus.status === 'expired' && 'Request expired'}
          </span>
        </div>
      )}

      {/* Compact form fields */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="paymentDate" className="text-xs">Service Date *</Label>
            <Input
              id="paymentDate"
              name="paymentDate"
              type="date"
              className="h-8 text-sm"
              value={formData.paymentDate}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="amount" className="text-xs">Amount *</Label>
            <div className="relative">
              <DollarSign className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                className="pl-7 h-8 text-sm"
                placeholder="29.00"
                value={formData.amount}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="itemName" className="text-xs flex items-center gap-1">
            <Package className="w-3 h-3" />
            Provider / Service *
          </Label>
          <Input
            id="itemName"
            name="itemName"
            className="h-8 text-sm"
            placeholder="Dr. Jane Smith, MD"
            value={formData.itemName}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="invoiceNumber" className="text-xs">Claim / NPI Number</Label>
            <Input
              id="invoiceNumber"
              name="invoiceNumber"
              className="h-8 text-sm"
              placeholder="CLM-2024-001"
              maxLength={20}
              value={formData.invoiceNumber}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="billingCycle" className="text-xs">Diagnosis Code (ICD-10)</Label>
            <Input
              id="billingCycle"
              name="billingCycle"
              className="h-8 text-sm"
              placeholder="Z00.00"
              value={formData.billingCycle}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="description" className="text-xs">Description / Notes</Label>
          <Textarea
            id="description"
            name="description"
            className="text-sm"
            placeholder="Procedure details, CPT codes, network status, etc."
            rows={2}
            value={formData.description}
            onChange={handleInputChange}
          />
        </div>

        {/* Receipt/Invoice Upload - Compact */}
        <div className="space-y-1">
          <Label htmlFor="receipt" className="text-xs flex items-center gap-1">
            <Upload className="w-3 h-3" />
            Superbill / EOB (PDF) *
          </Label>
          <div className="border-2 border-dashed rounded p-3 text-center hover:border-primary/50 transition-colors">
            <Label htmlFor="receipt" className="cursor-pointer text-xs text-primary">
              {receiptFile ? receiptFile.name : 'Click to upload'}
              <Input
                id="receipt"
                name="receipt"
                type="file"
                accept=".pdf"
                className="sr-only"
                onChange={handleFileChange}
              />
            </Label>
            {receiptFile && (
              <p className="text-xs text-muted-foreground mt-1">
                {(receiptFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>
        </div>

        {/* Payment Info - Compact */}
        <div className="pt-2 border-t space-y-2">
          <p className="text-xs font-medium flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Reimbursement Account (Push approval required)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="routingNumber" className="text-xs">Routing *</Label>
              <Input
                id="routingNumber"
                name="routingNumber"
                type="text"
                maxLength={9}
                className="h-8 text-sm"
                placeholder="123456789"
                value={formData.routingNumber}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="accountNumber" className="text-xs">Account *</Label>
              <Input
                id="accountNumber"
                name="accountNumber"
                type="text"
                className="h-8 text-sm"
                placeholder="Account number"
                value={formData.accountNumber}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="accountNumberConfirm" className="text-xs">Confirm Account *</Label>
            <Input
              id="accountNumberConfirm"
              name="accountNumberConfirm"
              type="text"
              className="h-8 text-sm"
              placeholder="Re-enter"
              value={formData.accountNumberConfirm}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end pt-2">
        <Button type="submit" size="sm" disabled={loading || cibaStatus.status === 'pending' || checkingEnrollment} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : checkingEnrollment ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Submit Claim
            </>
          )}
        </Button>
      </div>

      {/* Guardian Enrollment Modal */}
      <GuardianEnrollmentModal
        open={showEnrollmentModal}
        onOpenChange={setShowEnrollmentModal}
        onEnrollmentComplete={handleEnrollmentComplete}
      />
    </form>
  );
}
