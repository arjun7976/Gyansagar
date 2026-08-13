"use client";
import { useState } from "react";

export default function SettingsPage() {
  const [form, setForm] = useState({
    instituteName: "GyanSagar Coaching Institute",
    supportEmail: "support@gyansagar.com",
    timezone: "Asia/Kolkata",
    enableWhatsapp: false,
    enableEmail: true,
  });
  
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    // Simulate API call to save settings
    await new Promise(resolve => setTimeout(resolve, 800));
    setSaving(false);
    setSuccess(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Institute Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Manage global configuration and notification preferences.</p>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          Settings saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">General Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Institute Name</label>
              <input 
                type="text" 
                value={form.instituteName} 
                onChange={(e) => setForm({...form, instituteName: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
              <input 
                type="email" 
                value={form.supportEmail} 
                onChange={(e) => setForm({...form, supportEmail: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select 
                value={form.timezone} 
                onChange={(e) => setForm({...form, timezone: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Notification Preferences</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input 
                type="checkbox" 
                checked={form.enableEmail}
                onChange={(e) => setForm({...form, enableEmail: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable Email Notifications (Students & Results)</span>
            </label>
            <label className="flex items-center gap-3">
              <input 
                type="checkbox" 
                checked={form.enableWhatsapp}
                onChange={(e) => setForm({...form, enableWhatsapp: e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable WhatsApp Notifications (Requires API setup)</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}