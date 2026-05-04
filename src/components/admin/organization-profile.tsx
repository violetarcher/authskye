'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, AlertCircle, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OrganizationData {
  id?: string;
  name?: string;
  display_name?: string;
  metadata?: {
    logo_url?: string;
    website?: string;
    industry?: string;
  };
}

interface OrganizationProfileProps {
  orgId: string;
}

const INDUSTRIES = [
  'Healthcare',
  'Technology',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Professional Services',
  'Non-Profit',
  'Government',
  'Other',
];

export function OrganizationProfile({ orgId }: OrganizationProfileProps) {
  const [orgData, setOrgData] = useState<OrganizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    display_name: '',
    logo_url: '',
    website: '',
    industry: '',
  });

  // Fetch organization data
  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        setIsLoading(true);
        console.log('🔍 Fetching org settings for:', orgId);
        const response = await fetch(`/api/organizations/${orgId}/settings`);

        console.log('📡 Response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ API Error:', errorData);
          throw new Error(errorData.message || errorData.error || 'Failed to fetch organization settings');
        }

        const data = await response.json();
        console.log('✅ Org data loaded:', data);
        setOrgData(data);

        // Populate form
        setFormData({
          display_name: data.display_name || '',
          logo_url: data.metadata?.logo_url || '',
          website: data.metadata?.website || '',
          industry: data.metadata?.industry || '',
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load organization data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrgData();
  }, [orgId]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (success) setSuccess(false);
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    // Filter out empty strings before sending
    const cleanedData: any = {};
    if (formData.display_name) cleanedData.display_name = formData.display_name;
    if (formData.logo_url) cleanedData.logo_url = formData.logo_url;
    if (formData.website) cleanedData.website = formData.website;
    if (formData.industry) cleanedData.industry = formData.industry;

    console.log('💾 Saving organization data:', cleanedData);

    try {
      const response = await fetch(`/api/organizations/${orgId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData),
      });

      console.log('📡 Save response status:', response.status);

      if (!response.ok) {
        const data = await response.json();
        console.error('❌ Save failed:', data);
        throw new Error(data.message || data.error || data.details || 'Failed to update settings');
      }

      console.log('✅ Organization saved successfully');
      setSuccess(true);

      // Refresh the page after 2 seconds to show updated metadata
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error('❌ Save error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Profile</CardTitle>
        <CardDescription>
          Update your organization's name, logo, and other details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-900">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Organization settings updated successfully! Refreshing...
            </AlertDescription>
          </Alert>
        )}

        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="display_name">Organization Name</Label>
          <Input
            id="display_name"
            value={formData.display_name}
            onChange={(e) => handleChange('display_name', e.target.value)}
            disabled={isSaving}
            placeholder="Acme Healthcare"
          />
          <p className="text-xs text-muted-foreground">
            The name that appears throughout the application
          </p>
        </div>

        {/* Logo URL */}
        <div className="space-y-2">
          <Label htmlFor="logo_url">Logo URL</Label>
          <Input
            id="logo_url"
            type="url"
            value={formData.logo_url}
            onChange={(e) => handleChange('logo_url', e.target.value)}
            disabled={isSaving}
            placeholder="https://example.com/logo.png"
          />
          <p className="text-xs text-muted-foreground">
            URL to your organization's logo (publicly accessible)
          </p>

          {/* Logo Preview */}
          {formData.logo_url && (
            <div className="mt-2 p-4 border rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">Logo Preview</p>
              <div className="flex items-center justify-center bg-white p-4 rounded border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formData.logo_url}
                  alt="Organization logo"
                  className="max-h-16 max-w-48 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Website */}
        <div className="space-y-2">
          <Label htmlFor="website">Company Website</Label>
          <Input
            id="website"
            type="url"
            value={formData.website}
            onChange={(e) => handleChange('website', e.target.value)}
            disabled={isSaving}
            placeholder="https://acme-healthcare.com"
          />
        </div>

        {/* Industry */}
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Select
            value={formData.industry}
            onValueChange={(value) => handleChange('industry', value)}
            disabled={isSaving}
          >
            <SelectTrigger id="industry">
              <SelectValue placeholder="Select an industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
