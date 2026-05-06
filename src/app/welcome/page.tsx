import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Zap, CheckCircle, Shield, Award } from 'lucide-react';

export const metadata = {
  title: 'Welcome | EnergyCo',
  description: 'Simple, transparent energy plans for your home',
};

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">EnergyCo</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">Plans & Rates</a>
            <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">Business</a>
            <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">Support</a>
            <Button asChild variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
              <Link href="/api/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center">
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Get a fair and fixed<br />energy plan with ease
            </h1>
            <p className="text-xl lg:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              The price you see is the price you pay.<br />
              <span className="font-semibold">No Fine Print.</span>
            </p>

            {/* CTA Box */}
            <Card className="max-w-xl mx-auto shadow-xl border-2 border-blue-100">
              <CardContent className="pt-8 pb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Manage your account or get started
                </h3>
                <div className="space-y-3">
                  <Button asChild size="lg" className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700">
                    <Link href="/api/auth/login">
                      Sign In to Your Account
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="w-full h-14 text-lg border-2">
                    <Link href="/organizations/signup">
                      <Building2 className="mr-2 h-5 w-5" />
                      Business Solutions
                    </Link>
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  New customer? Sign in to create your account
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
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">60-Day Guarantee</h4>
              <p className="text-sm text-gray-600">Switch with confidence</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <Award className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Award-Winning Service</h4>
              <p className="text-sm text-gray-600">Rated #1 in customer care</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">No Hidden Fees</h4>
              <p className="text-sm text-gray-600">Transparent pricing always</p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
                Why thousands of customers choose EnergyCo
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Fixed-rate plans</h3>
                    <p className="text-gray-600">Lock in your rate and avoid price surprises</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Easy account management</h3>
                    <p className="text-gray-600">Pay bills and track usage online anytime</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">24/7 customer support</h3>
                    <p className="text-gray-600">We're here when you need us most</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Green energy options</h3>
                    <p className="text-gray-600">Choose renewable energy for your home</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-xl p-8 border">
              <div className="text-center mb-6">
                <div className="inline-block bg-blue-100 rounded-full px-4 py-1 mb-4">
                  <span className="text-sm font-semibold text-blue-700">FEATURED PLAN</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">EnergySaver 12</h3>
                <p className="text-gray-600">12-month fixed rate</p>
              </div>
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-blue-600 mb-2">9.8¢</div>
                <p className="text-gray-600">per kWh</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  No cancellation fees
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  100% renewable option available
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  Price lock guarantee
                </li>
              </ul>
              <Button asChild size="lg" className="w-full h-12 bg-blue-600 hover:bg-blue-700">
                <Link href="/api/auth/login">
                  Get Started
                </Link>
              </Button>
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
                <Zap className="h-6 w-6 text-blue-400" />
                <span className="text-xl font-bold text-white">EnergyCo</span>
              </div>
              <p className="text-sm">
                Simple, transparent energy for your home.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Residential</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">View Plans</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Sign Up</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Business</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Business Plans</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Get a Quote</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pay Bill</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Report Outage</a></li>
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
