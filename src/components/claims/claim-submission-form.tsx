'use client';

import { useState } from 'react';
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
  Wand2
} from 'lucide-react';

interface BillSubmissionFormProps {
  user: any;
  onClaimSubmitted?: () => void; // Callback to refresh bills list
}

interface CIBAStatus {
  status: 'idle' | 'pending' | 'approved' | 'denied' | 'expired';
  authReqId?: string;
  message?: string;
}

// Demo data sets for autofill - cycles through different utility billing scenarios
const DEMO_DATA_SETS = [
  {
    serviceDate: new Date().toISOString().split('T')[0],
    providerName: 'PowerGrid Electric',
    providerNPI: '9876543210',
    diagnosisCode: 'ELEC-001',
    claimAmount: '125.50',
    description: 'Monthly electric bill - Residential account, summer peak rates',
    routingNumber: '121000248', // Wells Fargo routing (demo)
    accountNumber: '9876543210',
    accountNumberConfirm: '9876543210',
  },
  {
    serviceDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
    providerName: 'NaturalGas Co',
    providerNPI: '5554443333',
    diagnosisCode: 'GAS-002',
    claimAmount: '89.75',
    description: 'Monthly natural gas bill - Heating and cooking services',
    routingNumber: '026009593', // Bank of America routing (demo)
    accountNumber: '5551234567',
    accountNumberConfirm: '5551234567',
  },
  {
    serviceDate: new Date(Date.now() - 172800000).toISOString().split('T')[0], // 2 days ago
    providerName: 'CityWater Services',
    providerNPI: '1112223334',
    diagnosisCode: 'WATER-003',
    claimAmount: '45.00',
    description: 'Monthly water and sewage bill - Residential usage',
    routingNumber: '071000013', // Chase routing (demo)
    accountNumber: '8882229999',
    accountNumberConfirm: '8882229999',
  },
  {
    serviceDate: new Date(Date.now() - 259200000).toISOString().split('T')[0], // 3 days ago
    providerName: 'Green Solar Rebate',
    providerNPI: '1234567890',
    diagnosisCode: 'SOLAR-004',
    claimAmount: '320.00',
    description: 'Solar panel credit - Renewable energy generation credit for excess power',
    routingNumber: '111000025', // Citibank routing (demo)
    accountNumber: '7773331111',
    accountNumberConfirm: '7773331111',
  },
];

export function ClaimSubmissionForm({ user, onClaimSubmitted }: BillSubmissionFormProps) {
  const [loading, setLoading] = useState(false);
  const [cibaStatus, setCibaStatus] = useState<CIBAStatus>({ status: 'idle' });
  const [currentDemoIndex, setCurrentDemoIndex] = useState(0);
  const [formData, setFormData] = useState({
    serviceDate: '',
    providerName: '',
    providerNPI: '',
    diagnosisCode: '',
    claimAmount: '',
    description: '',
    routingNumber: '',
    accountNumber: '',
    accountNumberConfirm: '',
  });
  const [superbillFile, setSuperbillFile] = useState<File | null>(null);

  // Autofill demo data - cycles through different utility billing scenarios
  const fillDemoData = () => {
    const demoData = DEMO_DATA_SETS[currentDemoIndex];
    setFormData(demoData);

    // Cycle to next demo data set
    setCurrentDemoIndex((currentDemoIndex + 1) % DEMO_DATA_SETS.length);

    // Create a mock PDF file for the invoice
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
(UTILITY BILL - DEMO) Tj
/F1 12 Tf
100 650 Td
(Provider: ${demoData.providerName}) Tj
100 630 Td
(Account Holder: ${user?.name || 'Demo Customer'}) Tj
100 610 Td
(Service Date: ${new Date(demoData.serviceDate).toLocaleDateString()}) Tj
100 590 Td
(Service Type: ${demoData.diagnosisCode}) Tj
100 570 Td
(Amount Due: $${demoData.claimAmount}) Tj
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
    const file = new File([blob], `invoice_${demoData.providerName.split(' ')[0].toLowerCase()}.pdf`, { type: 'application/pdf' });
    setSuperbillFile(file);

    toast.success('Demo data filled!', {
      description: `Scenario ${currentDemoIndex + 1}: ${demoData.providerName}`,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf' && file.size <= 10 * 1024 * 1024) {
        setSuperbillFile(file);
        toast.success('Superbill uploaded', {
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
    if (!formData.serviceDate || !formData.providerName || !formData.claimAmount) {
      toast.error('Missing required fields', {
        description: 'Please fill out all required fields',
      });
      return false;
    }

    if (!superbillFile) {
      toast.error('Invoice required', {
        description: 'Please upload your utility bill invoice (PDF)',
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

      console.log('🔐 Initiating CIBA flow for bill payment');

      // Step 1: Initiate CIBA authentication request
      const cibaResponse = await fetch('/api/ciba/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'openid profile email',
          binding_message: `Approve payment: ${formData.claimAmount} USD`,
        }),
      });

      if (!cibaResponse.ok) {
        const error = await cibaResponse.json();
        throw new Error(error.message || 'Failed to initiate CIBA');
      }

      const cibaData = await cibaResponse.json();
      const { auth_req_id, expires_in } = cibaData;

      console.log('✅ CIBA initiated:', { auth_req_id, expires_in });

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
      console.error('❌ CIBA error:', error);
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
    // Give at least 1 minute for polling, or use the expiry time from Auth0
    const maxDuration = Math.max(60000, expiresIn * 1000); // At least 60 seconds
    const pollInterval = 5000; // Poll every 5 seconds (Auth0 recommended)

    return new Promise((resolve) => {
      const poll = async () => {
        const elapsed = Date.now() - startTime;
        console.log(`🔄 Polling CIBA (${Math.floor(elapsed / 1000)}s elapsed)...`);

        if (elapsed > maxDuration) {
          console.log('⏰ Polling timeout reached');
          resolve({ status: 'expired' });
          return;
        }

        try {
          const response = await fetch('/api/ciba/poll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auth_req_id: authReqId }),
          });

          console.log('📥 Poll HTTP status:', response.status);

          if (!response.ok && response.status >= 500) {
            // Server error - treat as temporary issue and keep polling
            console.warn('⚠️ Server error, continuing to poll...');
            setTimeout(poll, pollInterval);
            return;
          }

          const data = await response.json();
          console.log('📦 Poll data:', data);

          if (data.status === 'approved') {
            console.log('✅ CIBA Approved!');
            resolve({ status: 'approved' });
          } else if (data.status === 'denied') {
            console.log('❌ CIBA Denied');
            resolve({ status: 'denied' });
          } else if (data.status === 'expired') {
            console.log('⏰ CIBA Expired');
            resolve({ status: 'expired' });
          } else if (data.status === 'pending' || data.error === 'authorization_pending') {
            // Continue polling
            console.log('⏳ Still pending, polling again in 5 seconds...');
            setTimeout(poll, pollInterval);
          } else {
            // Unknown status - log and continue polling
            console.warn('⚠️ Unknown poll status, continuing:', data);
            setTimeout(poll, pollInterval);
          }
        } catch (error) {
          console.error('❌ Poll fetch error:', error);
          // Network error - continue polling
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

    setLoading(true);

    try {
      // Step 1: Initiate CIBA authentication
      toast.info('Authentication required', {
        description: 'Please approve the payment via Guardian app on your mobile device',
      });

      const cibaApproved = await initiateCIBA();

      if (!cibaApproved) {
        setLoading(false);
        return;
      }

      // Step 2: Submit claim after CIBA approval
      const formDataToSend = new FormData();
      formDataToSend.append('serviceDate', formData.serviceDate);
      formDataToSend.append('providerName', formData.providerName);
      formDataToSend.append('providerNPI', formData.providerNPI);
      formDataToSend.append('diagnosisCode', formData.diagnosisCode);
      formDataToSend.append('claimAmount', formData.claimAmount);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('routingNumber', formData.routingNumber);
      formDataToSend.append('accountNumber', formData.accountNumber);
      if (superbillFile) {
        formDataToSend.append('superbill', superbillFile);
      }

      const response = await fetch('/api/claims/submit', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit payment');
      }

      const result = await response.json();

      toast.success('Bill payment submitted successfully!', {
        description: `Payment ID: ${result.claimId}`,
      });

      // Trigger bills list refresh
      if (onClaimSubmitted) {
        onClaimSubmitted();
      }

      // Reset form
      setFormData({
        serviceDate: '',
        providerName: '',
        providerNPI: '',
        diagnosisCode: '',
        claimAmount: '',
        description: '',
        routingNumber: '',
        accountNumber: '',
        accountNumberConfirm: '',
      });
      setSuperbillFile(null);
      setCibaStatus({ status: 'idle' });
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error('Submission failed', {
        description: error.message || 'Failed to submit payment',
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
            {cibaStatus.status === 'pending' && 'Waiting for payment approval on Guardian app'}
            {cibaStatus.status === 'approved' && 'Approved! Submitting payment...'}
            {cibaStatus.status === 'denied' && 'Payment denied'}
            {cibaStatus.status === 'expired' && 'Request expired'}
          </span>
        </div>
      )}

      {/* Compact form fields */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="serviceDate" className="text-xs">Billing Period *</Label>
            <Input
              id="serviceDate"
              name="serviceDate"
              type="date"
              className="h-8 text-sm"
              value={formData.serviceDate}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="claimAmount" className="text-xs">Amount *</Label>
            <div className="relative">
              <DollarSign className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
              <Input
                id="claimAmount"
                name="claimAmount"
                type="number"
                step="0.01"
                className="pl-7 h-8 text-sm"
                placeholder="0.00"
                value={formData.claimAmount}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="providerName" className="text-xs">Utility Provider *</Label>
          <Input
            id="providerName"
            name="providerName"
            className="h-8 text-sm"
            placeholder="PowerGrid Electric"
            value={formData.providerName}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="providerNPI" className="text-xs">Account Number</Label>
            <Input
              id="providerNPI"
              name="providerNPI"
              className="h-8 text-sm"
              placeholder="1234567890"
              maxLength={10}
              value={formData.providerNPI}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="diagnosisCode" className="text-xs">Service Type</Label>
            <Input
              id="diagnosisCode"
              name="diagnosisCode"
              className="h-8 text-sm"
              placeholder="ELEC-001"
              value={formData.diagnosisCode}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="description" className="text-xs">Description</Label>
          <Textarea
            id="description"
            name="description"
            className="text-sm"
            placeholder="Service description"
            rows={2}
            value={formData.description}
            onChange={handleInputChange}
          />
        </div>

        {/* Invoice Upload - Compact */}
        <div className="space-y-1">
          <Label htmlFor="superbill" className="text-xs flex items-center gap-1">
            <Upload className="w-3 h-3" />
            Utility Invoice (PDF) *
          </Label>
          <div className="border-2 border-dashed rounded p-3 text-center hover:border-primary/50 transition-colors">
            <Label htmlFor="superbill" className="cursor-pointer text-xs text-primary">
              {superbillFile ? superbillFile.name : 'Click to upload'}
              <Input
                id="superbill"
                name="superbill"
                type="file"
                accept=".pdf"
                className="sr-only"
                onChange={handleFileChange}
              />
            </Label>
            {superbillFile && (
              <p className="text-xs text-muted-foreground mt-1">
                {(superbillFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>
        </div>

        {/* Bank Info - Compact */}
        <div className="pt-2 border-t space-y-2">
          <p className="text-xs font-medium flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Payment Account (Push approval required)
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
                type="password"
                className="h-8 text-sm"
                placeholder="••••••••"
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
        <Button type="submit" size="sm" disabled={loading || cibaStatus.status === 'pending'} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Submit Payment
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
