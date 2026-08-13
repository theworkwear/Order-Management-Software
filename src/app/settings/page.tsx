'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { CompanySettings } from '@/lib/types/invoice';
import {
  Settings as SettingsIcon, Building2, Mail, Phone, MapPin,
  FileText, Save, Loader2, CheckCircle, AlertCircle,
  Link2, Sheet, ExternalLink
} from 'lucide-react';

const DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'The Work Wear',
  companyEmail: '',
  companyPhone: '',
  companyAddress: '',
  companyLogo: '',
  invoicePrefix: 'INV',
  invoiceFooter: 'Thank you for your business!',
  invoiceCounter: 1,
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const [isConnected, setIsConnected] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const isGoogleConnected = isConnected || !!(session as any)?.accessToken;

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setIsConnected(!!data.isConnected);
        setSpreadsheetId(data.spreadsheetId || '');
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error('Failed to save');

      setSuccessMsg('Settings saved successfully ✓');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGoogle = () => {
    signIn('google', { callbackUrl: '/settings' });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure your company details and database connection
        </p>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm flex items-center gap-2 fade-in">
          <CheckCircle className="w-4 h-4" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm flex items-center gap-2 fade-in">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Google Connection */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Link2 className="w-4.5 h-4.5 text-blue-600" />
          <h2 className="font-semibold text-slate-900">Database Connection</h2>
        </div>
        <div className="p-6">
          {isGoogleConnected ? (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800">Database Connected</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Connected via environment credentials (.env)
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>Database ID:</p>
                <code className="text-[11px] bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg font-mono text-slate-700">
                  {spreadsheetId || 'Connected'}
                </code>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Sheet className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-600 font-medium mb-1">Connect Data Source Account</p>
              <p className="text-xs text-slate-400 mb-4">
                Required to read and write system order data
              </p>

              <button
                onClick={handleConnectGoogle}
                className="btn-primary px-6 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Connect Google Account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Company Settings */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Building2 className="w-4.5 h-4.5 text-indigo-600" />
          <h2 className="font-semibold text-slate-900">Company Information</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Company Name</label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
            <input
              type="email"
              value={settings.companyEmail}
              onChange={(e) => setSettings(prev => ({ ...prev, companyEmail: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Phone</label>
            <input
              type="text"
              value={settings.companyPhone}
              onChange={(e) => setSettings(prev => ({ ...prev, companyPhone: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Address</label>
            <input
              type="text"
              value={settings.companyAddress}
              onChange={(e) => setSettings(prev => ({ ...prev, companyAddress: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
            />
          </div>
        </div>
      </div>

      {/* Invoice Settings */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <FileText className="w-4.5 h-4.5 text-green-600" />
          <h2 className="font-semibold text-slate-900">Invoice Settings</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Invoice Prefix</label>
            <input
              type="text"
              value={settings.invoicePrefix}
              onChange={(e) => setSettings(prev => ({ ...prev, invoicePrefix: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
              placeholder="INV"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Invoice Footer</label>
            <input
              type="text"
              value={settings.invoiceFooter}
              onChange={(e) => setSettings(prev => ({ ...prev, invoiceFooter: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
              placeholder="Thank you for your business!"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
