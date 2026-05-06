import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Zap, Shield, DollarSign, TrendingDown, Clock, Smartphone, Leaf } from 'lucide-react';

export const metadata = {
  title: 'Welcome | EnergyCo',
  description: 'Powering your home with reliable, affordable energy',
};

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Zap className="h-12 w-12 text-amber-400" />
              <h1 className="text-5xl lg:text-6xl font-bold">
                EnergyCo
              </h1>
            </div>
            <p className="text-2xl lg:text-3xl font-light mb-6 text-blue-100">
              Powering Your Home with Reliable, Affordable Energy
            </p>
            <p className="text-lg lg:text-xl mb-10 text-blue-200 max-w-2xl mx-auto">
              Manage your account, track usage, and pay bills online. Join thousands of satisfied customers enjoying cleaner, smarter energy solutions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="h-14 px-8 text-lg bg-amber-500 hover:bg-amber-600 text-blue-900 font-semibold">
                <Link href="/api/auth/login">
                  Sign In to Your Account
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg border-2 border-white text-white hover:bg-white/10">
                <Link href="/organizations/signup">
                  <Building2 className="mr-2 h-5 w-5" />
                  Business Solutions
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Why Choose EnergyCo?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We're committed to providing exceptional service and sustainable energy solutions for your home
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <TrendingDown className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Lower Your Bills</h3>
                <p className="text-gray-600">
                  Save up to 20% with our energy efficiency programs and smart usage insights
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Reliable Service</h3>
                <p className="text-gray-600">
                  99.9% uptime with 24/7 emergency support for your peace of mind
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                  <Smartphone className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Easy Management</h3>
                <p className="text-gray-600">
                  Manage your account, track usage, and pay bills anytime from any device
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                  <Leaf className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Clean Energy</h3>
                <p className="text-gray-600">
                  Choose from renewable energy options including solar and wind power
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Sign in to manage your account or explore our business solutions for commercial properties
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="h-14 px-8 text-lg bg-white text-blue-900 hover:bg-gray-100 font-semibold">
              <Link href="/api/auth/login">
                Access Your Account
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg border-2 border-white text-white hover:bg-white/10">
              <Link href="/organizations/signup">
                Business Account Signup
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-6 w-6 text-amber-400" />
                <span className="text-xl font-bold text-white">EnergyCo</span>
              </div>
              <p className="text-sm">
                Powering communities with reliable, affordable, and sustainable energy solutions.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Account Login</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pay Bill</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Report Outage</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Energy Savings</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact Us</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  24/7 Customer Support
                </li>
                <li className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Emergency: 1-800-ENERGY-CO
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2024 EnergyCo. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
