'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Building2, Activity, Shield, Lock, TrendingUp, Trophy } from "lucide-react"

const kpiData = [
  { title: "Active Bets", value: "3", change: "$450 in action", icon: Activity, color: "text-green-600" },
  { title: "Account Balance", value: "$2,450", change: "+$180 this week", icon: TrendingUp, color: "text-emerald-600" },
  { title: "Win Rate", value: "58.3%", change: "Last 30 days", icon: Trophy, color: "text-amber-500" },
  { title: "Live Lines", value: "247", change: "Across 12 sports", icon: Activity, color: "text-purple-600" },
];

const recentActivity = [
  { id: "BET-001", action: "Parlay settled — Won", resource: "NBA + NHL 3-leg — $340 payout", status: "Completed", time: "2 min ago" },
  { id: "BET-002", action: "Bet placed", resource: "Chiefs -3.5 vs Raiders — $100", status: "Active", time: "1 hour ago" },
  { id: "BET-003", action: "Deposit processed", resource: "$500 — Visa ending 4242", status: "Completed", time: "Yesterday" },
  { id: "BET-004", action: "Bet graded — Push", resource: "Lakers -7.5 — stake returned", status: "Active", time: "2 days ago" },
  { id: "BET-005", action: "Withdrawal requested", resource: "$250 — processing", status: "Pending", time: "3 days ago" },
];

export default function HomePage() {
  const { user, error, isLoading } = useUser();

  // Handle invitation flow - redirect to login with invitation params
  useEffect(() => {
    if (!isLoading && !user && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const invitation = params.get('invitation');
      const organization = params.get('organization');

      if (invitation && organization) {
        window.location.href = `/api/auth/login?invitation=${invitation}&organization=${organization}`;
      }
    }
  }, [isLoading, user]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Authentication error: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Not logged in - show welcome/login page
  if (!user) {
    return <WelcomePage />;
  }

  // User is logged in - show dashboard
  return <Dashboard user={user} />;
}

function WelcomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#15803d] to-[#16a34a] flex items-center justify-center">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Sportsbook</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#" className="text-gray-700 hover:text-primary font-medium">Sports</a>
            <a href="#" className="text-gray-700 hover:text-primary font-medium">Live Betting</a>
            <a href="#" className="text-gray-700 hover:text-primary font-medium">Parlays</a>
            <a href="#" className="text-gray-700 hover:text-primary font-medium">Promotions</a>
            <Button asChild variant="outline" className="border-primary text-primary hover:bg-green-50">
              <a href="/api/auth/login">Sign In</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary bg-green-100 px-3 py-1 rounded-full mb-6">
              Sports Betting Platform
            </span>
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Your edge.<br />Every game.
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Sportsbook gives you real-time odds, smart parlays, and push-approval for every wager — built for serious bettors who demand security and speed.
            </p>

            {/* CTA Box */}
            <Card className="max-w-xl mx-auto shadow-xl border-2 border-green-100">
              <CardContent className="pt-8 pb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Access your account
                </h3>
                <div className="space-y-3">
                  <Button asChild size="lg" className="w-full h-14 text-lg">
                    <a href="/api/auth/login">
                      Sign In to Sportsbook
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="w-full h-14 text-lg border-2">
                    <Link href="/organizations/signup">
                      <Building2 className="mr-2 h-5 w-5" />
                      Open an Account
                    </Link>
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Must be 21+. Gambling problem? Call 1-800-GAMBLER.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="bg-white border-y py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Live Odds &amp; Lines</h4>
              <p className="text-sm text-gray-600">Real-time lines across NFL, NBA, MLB, NHL, and 8 more sports — updated as the action happens</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                <Shield className="h-6 w-6 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Secure Deposits &amp; Payouts</h4>
              <p className="text-sm text-gray-600">Push-approval for every wager, instant deposits, and fast withdrawals with full audit trails</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                <Lock className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Responsible Gaming</h4>
              <p className="text-sm text-gray-600">Deposit limits, self-exclusion, and spend tracking — your account, your rules</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-[#15803d] to-[#16a34a] flex items-center justify-center">
                  <Trophy className="h-3 w-3 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Sportsbook</span>
              </div>
              <p className="text-sm">
                Your edge. Every game.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Betting</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Sports</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Live Betting</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Parlays</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Responsible Gaming</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm">
            <p>&copy; 2026 Sportsbook. All rights reserved. Must be 21+. Please play responsibly.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Dashboard({ user }: { user: any }) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [preferences, setPreferences] = useState({
    betConfirmations: false,
    winLossAlerts: false,
    promotionalOffers: false,
    responsibleGaming: false,
  });

  const fetchMetadata = async () => {
    try {
      const response = await fetch('/api/user/metadata');
      if (response.ok) {
        const data = await response.json();
        const metadata = data.user_metadata || {};

        setPreferences({
          betConfirmations: metadata.bet_confirmations === true,
          winLossAlerts: metadata.win_loss_alerts === true,
          promotionalOffers: metadata.promotional_offers === true,
          responsibleGaming: metadata.responsible_gaming === true,
        });
      }
    } catch (error) {
      console.error('Failed to fetch user metadata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  const handlePreferenceChange = async (key: string, value: boolean) => {
    const keyMap: { [key: string]: keyof typeof preferences } = {
      'bet_confirmations': 'betConfirmations',
      'win_loss_alerts': 'winLossAlerts',
      'promotional_offers': 'promotionalOffers',
      'responsible_gaming': 'responsibleGaming',
    };

    const frontendKey = keyMap[key];

    setPreferences(prev => ({
      ...prev,
      [frontendKey]: value,
    }));

    setIsSaving(true);
    setSaveMessage('');

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [key]: value,
        }),
      });

      if (response.ok) {
        await fetchMetadata();
        setSaveMessage('Preferences saved successfully!');
      } else {
        setSaveMessage('Failed to save preferences. Please try again.');
        setPreferences(prev => ({
          ...prev,
          [frontendKey]: !value,
        }));
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      setSaveMessage('Error saving preferences. Please try again.');
      setPreferences(prev => ({
        ...prev,
        [frontendKey]: !value,
      }));
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.name || user.email}! Here's your betting summary.
        </p>
      </header>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">{kpi.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Activity */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest bets and account activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.action}</TableCell>
                    <TableCell className="text-muted-foreground">{activity.resource}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{activity.time}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={
                        activity.status === 'Active' ? 'secondary' : 'default'
                      }>
                        {activity.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Betting Preferences</CardTitle>
            <CardDescription>Manage your account and notification settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="betConfirmations" className="text-sm font-medium">
                      Bet Confirmations
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Receive confirmation for every bet placed
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${preferences.betConfirmations ? 'text-primary' : 'text-gray-400'}`}>
                      {preferences.betConfirmations ? 'ON' : 'OFF'}
                    </span>
                    <Switch
                      id="betConfirmations"
                      checked={preferences.betConfirmations}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('bet_confirmations', checked)}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="winLossAlerts" className="text-sm font-medium">
                      Win / Loss Alerts
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified when bets are graded
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${preferences.winLossAlerts ? 'text-primary' : 'text-gray-400'}`}>
                      {preferences.winLossAlerts ? 'ON' : 'OFF'}
                    </span>
                    <Switch
                      id="winLossAlerts"
                      checked={preferences.winLossAlerts}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('win_loss_alerts', checked)}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="promotionalOffers" className="text-sm font-medium">
                      Promotional Offers
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Odds boosts, free bets, and deposit bonuses
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${preferences.promotionalOffers ? 'text-primary' : 'text-gray-400'}`}>
                      {preferences.promotionalOffers ? 'ON' : 'OFF'}
                    </span>
                    <Switch
                      id="promotionalOffers"
                      checked={preferences.promotionalOffers}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('promotional_offers', checked)}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="responsibleGaming" className="text-sm font-medium">
                      Responsible Gaming Reminders
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Weekly spend summaries and limit reminders
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${preferences.responsibleGaming ? 'text-primary' : 'text-gray-400'}`}>
                      {preferences.responsibleGaming ? 'ON' : 'OFF'}
                    </span>
                    <Switch
                      id="responsibleGaming"
                      checked={preferences.responsibleGaming}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('responsible_gaming', checked)}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {saveMessage && (
                  <Alert className={saveMessage.includes('success') ? 'border-green-500' : 'border-red-500'}>
                    <AlertDescription>{saveMessage}</AlertDescription>
                  </Alert>
                )}

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Preferences are saved automatically.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
