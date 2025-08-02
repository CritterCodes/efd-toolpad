'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Shield, 
  DollarSign, 
  Calculator, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Lock,
  CheckCircle
} from 'lucide-react';

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Security
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [securityCode, setSecurityCode] = useState('');
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [codeExpiry, setCodeExpiry] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    wage: 45,
    administrativeFee: 0.15,
    businessFee: 0.25,
    consumablesFee: 0.08
  });
  
  // Pricing impact preview
  const [pricingImpact, setPricingImpact] = useState(null);
  const [showImpactPreview, setShowImpactPreview] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      loadSettings();
    }
  }, [status]);

  // Auto-refresh code expiry check
  useEffect(() => {
    if (isCodeVerified && codeExpiry) {
      const interval = setInterval(() => {
        if (new Date() > new Date(codeExpiry)) {
          setIsCodeVerified(false);
          setCodeExpiry(null);
          setError('Security code has expired. Please verify again.');
        }
      }, 30000); // Check every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isCodeVerified, codeExpiry]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load settings');
      }
      
      setSettings(data);
      setFormData({
        wage: data.pricing.wage,
        administrativeFee: data.pricing.administrativeFee,
        businessFee: data.pricing.businessFee,
        consumablesFee: data.pricing.consumablesFee
      });
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateNewCode = async () => {
    try {
      const response = await fetch('/api/admin/settings/verify-code', {
        method: 'PUT'
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate code');
      }
      
      setSecurityCode(data.securityCode);
      setCodeExpiry(data.expiresAt);
      setSuccess(`New security code generated: ${data.securityCode}`);
      
    } catch (error) {
      setError(error.message);
    }
  };

  const verifySecurityCode = async () => {
    try {
      const response = await fetch('/api/admin/settings/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ securityCode })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid security code');
      }
      
      setIsCodeVerified(true);
      setCodeExpiry(data.expiresAt);
      setShowSecurityDialog(false);
      setSuccess('Security code verified successfully');
      
    } catch (error) {
      setError(error.message);
    }
  };

  const previewPricingImpact = async () => {
    try {
      const response = await fetch('/api/admin/settings/pricing-impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricing: formData })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze pricing impact');
      }
      
      setPricingImpact(data.analysis);
      setShowImpactPreview(true);
      
    } catch (error) {
      setError(error.message);
    }
  };

  const saveSettings = async () => {
    if (!isCodeVerified) {
      setShowSecurityDialog(true);
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pricing: formData,
          securityCode: securityCode
        })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }
      
      setSuccess(`Settings saved successfully! Updated ${data.recalculation.updated} repair task prices.`);
      await loadSettings(); // Refresh settings
      
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  };

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return <div className="text-center p-8">Access denied. Please sign in.</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Admin Settings
          </h1>
          <p className="text-gray-600 mt-2">
            Manage pricing parameters and business settings
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isCodeVerified ? (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Verified
            </Badge>
          ) : (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Lock className="h-4 w-4" />
              Locked
            </Badge>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSecurityDialog(true)}
          >
            <Shield className="h-4 w-4 mr-2" />
            Security
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pricing Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="wage">Hourly Wage ($)</Label>
              <Input
                id="wage"
                type="number"
                step="0.01"
                min="0"
                max="200"
                value={formData.wage}
                onChange={(e) => handleInputChange('wage', parseFloat(e.target.value) || 0)}
                disabled={!isCodeVerified}
              />
            </div>

            <div>
              <Label htmlFor="adminFee">Administrative Fee (%)</Label>
              <Input
                id="adminFee"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={(formData.administrativeFee * 100).toFixed(1)}
                onChange={(e) => handleInputChange('administrativeFee', (parseFloat(e.target.value) || 0) / 100)}
                disabled={!isCodeVerified}
              />
            </div>

            <div>
              <Label htmlFor="businessFee">Business Fee (%)</Label>
              <Input
                id="businessFee"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={(formData.businessFee * 100).toFixed(1)}
                onChange={(e) => handleInputChange('businessFee', (parseFloat(e.target.value) || 0) / 100)}
                disabled={!isCodeVerified}
              />
            </div>

            <div>
              <Label htmlFor="consumablesFee">Consumables Fee (%)</Label>
              <Input
                id="consumablesFee"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={(formData.consumablesFee * 100).toFixed(1)}
                onChange={(e) => handleInputChange('consumablesFee', (parseFloat(e.target.value) || 0) / 100)}
                disabled={!isCodeVerified}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing Formula Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Pricing Formula
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-mono text-sm mb-4">
                basePrice = ((laborHours × wage) + (materialCost × 1.5)) × (fees + 1)
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Wage:</span>
                  <span>${formData.wage}/hour</span>
                </div>
                <div className="flex justify-between">
                  <span>Administrative Fee:</span>
                  <span>{(formData.administrativeFee * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Business Fee:</span>
                  <span>{(formData.businessFee * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Consumables Fee:</span>
                  <span>{(formData.consumablesFee * 100).toFixed(1)}%</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Total Fee Multiplier:</span>
                  <span>{(formData.administrativeFee + formData.businessFee + formData.consumablesFee + 1).toFixed(3)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Button
                variant="outline"
                onClick={previewPricingImpact}
                className="w-full"
                disabled={!isCodeVerified}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Preview Price Impact
              </Button>
              
              <Button
                onClick={saveSettings}
                disabled={saving || !isCodeVerified}
                className="w-full"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <DollarSign className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Saving & Recalculating...' : 'Save Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Dialog */}
      <Dialog open={showSecurityDialog} onOpenChange={setShowSecurityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Verification
            </DialogTitle>
            <DialogDescription>
              Enter the security code to access admin settings. Codes expire after 1 hour.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="security-code">Security Code</Label>
              <Input
                id="security-code"
                type="text"
                placeholder="Enter 12-digit security code"
                value={securityCode}
                onChange={(e) => setSecurityCode(e.target.value)}
                maxLength={12}
              />
            </div>
            
            {codeExpiry && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                Expires: {new Date(codeExpiry).toLocaleString()}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={generateNewCode}>
              Generate New Code
            </Button>
            <Button onClick={verifySecurityCode} disabled={!securityCode}>
              Verify Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pricing Impact Preview Dialog */}
      <Dialog open={showImpactPreview} onOpenChange={setShowImpactPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Pricing Impact Analysis</DialogTitle>
            <DialogDescription>
              Preview of how the new settings will affect repair task pricing
            </DialogDescription>
          </DialogHeader>
          
          {pricingImpact && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {pricingImpact.totalTasks}
                  </div>
                  <div className="text-sm text-gray-600">Total Tasks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {pricingImpact.summary.tasksWithIncrease}
                  </div>
                  <div className="text-sm text-gray-600">Price Increases</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {pricingImpact.summary.tasksWithDecrease}
                  </div>
                  <div className="text-sm text-gray-600">Price Decreases</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {pricingImpact.summary.tasksUnchanged}
                  </div>
                  <div className="text-sm text-gray-600">Unchanged</div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold mb-2">Average Price Change</h4>
                <div className="flex justify-between items-center">
                  <span>Current Average: ${pricingImpact.summary.currentAverage.toFixed(2)}</span>
                  <span>New Average: ${pricingImpact.summary.newAverage.toFixed(2)}</span>
                </div>
                <div className="text-center mt-2">
                  <span className={`font-bold ${pricingImpact.summary.averageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {pricingImpact.summary.averageChange >= 0 ? '+' : ''}
                    ${pricingImpact.summary.averageChange.toFixed(2)} 
                    ({pricingImpact.summary.percentChange.toFixed(1)}%)
                  </span>
                </div>
              </div>
              
              <div>
                <h4 className="font-bold mb-2">By Category</h4>
                <div className="space-y-2">
                  {Object.entries(pricingImpact.categoryAnalysis).map(([category, data]) => (
                    <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="capitalize font-medium">{category} ({data.count} tasks)</span>
                      <span className={`font-bold ${data.averageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${data.currentAverage.toFixed(2)} → ${data.newAverage.toFixed(2)} 
                        ({data.averageChange >= 0 ? '+' : ''}${data.averageChange.toFixed(2)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImpactPreview(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
