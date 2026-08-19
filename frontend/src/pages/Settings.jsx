import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Bell, 
  Shield, 
  CreditCard, 
  Globe,
  Zap,
  Save,
  RotateCcw,
  ChevronRight,
  Moon,
  Sun,
  Palette,
  Sliders,
  Copy
} from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  });

  const tabs = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'security', icon: Shield, label: 'Security' },
    { id: 'billing', icon: CreditCard, label: 'Billing' },
    { id: 'appearance', icon: Palette, label: 'Appearance' },
    { id: 'api', icon: Zap, label: 'API' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-3xl font-bold">
                A
              </div>
              <div>
                <h3 className="text-2xl font-display font-semibold text-white mb-1">
                  Admin User
                </h3>
                <p className="text-gray-400">admin@usagemeter.com</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="mt-3 text-primary-400 hover:text-primary-300 text-sm font-medium"
                >
                  Change Avatar
                </motion.button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  First Name
                </label>
                <input type="text" defaultValue="Admin" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Last Name
                </label>
                <input type="text" defaultValue="User" className="input-field" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input type="email" defaultValue="admin@usagemeter.com" className="input-field" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Company
                </label>
                <input type="text" defaultValue="Usage Meter Inc." className="input-field" />
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            {[
              { key: 'email', label: 'Email Notifications', description: 'Receive updates via email' },
              { key: 'push', label: 'Push Notifications', description: 'Receive browser push notifications' },
              { key: 'sms', label: 'SMS Alerts', description: 'Get critical alerts via SMS' },
            ].map((item) => (
              <motion.div
                key={item.key}
                whileHover={{ scale: 1.02 }}
                className="glass-card-light p-6 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-lg font-semibold text-white mb-1">{item.label}</h4>
                  <p className="text-gray-400 text-sm">{item.description}</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                  className={`w-14 h-8 rounded-full transition-colors ${
                    notifications[item.key] ? 'bg-primary-600' : 'bg-gray-600'
                  }`}
                >
                  <motion.div
                    animate={{ x: notifications[item.key] ? 24 : 4 }}
                    className="w-6 h-6 rounded-full bg-white"
                  />
                </motion.button>
              </motion.div>
            ))}
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="glass-card-light p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Change Password</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Current Password
                  </label>
                  <input type="password" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    New Password
                  </label>
                  <input type="password" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <input type="password" className="input-field" />
                </div>
              </div>
            </div>

            <div className="glass-card-light p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Two-Factor Authentication</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Add an extra layer of security to your account</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary"
                >
                  Enable 2FA
                </motion.button>
              </div>
            </div>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-6">
            <div className="glass-card-light p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Payment Method</h4>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="w-12 h-8 rounded bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium">•••• •••• •••• 4242</div>
                  <div className="text-gray-400 text-sm">Expires 12/25</div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-primary-400 hover:text-primary-300 text-sm font-medium"
                >
                  Edit
                </motion.button>
              </div>
            </div>

            <div className="glass-card-light p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Billing Address</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Street Address
                  </label>
                  <input type="text" defaultValue="123 Tech Street" className="input-field" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      City
                    </label>
                    <input type="text" defaultValue="San Francisco" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ZIP Code
                    </label>
                    <input type="text" defaultValue="94105" className="input-field" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div className="glass-card-light p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Theme</h4>
              <div className="grid grid-cols-2 gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDarkMode(true)}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    darkMode ? 'border-primary-500 bg-primary-500/10' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <Moon className="w-8 h-8 mx-auto mb-3 text-primary-400" />
                  <div className="text-white font-medium">Dark</div>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDarkMode(false)}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    !darkMode ? 'border-primary-500 bg-primary-500/10' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <Sun className="w-8 h-8 mx-auto mb-3 text-yellow-400" />
                  <div className="text-white font-medium">Light</div>
                </motion.button>
              </div>
            </div>

            <div className="glass-card-light p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Accent Color</h4>
              <div className="flex gap-4">
                {['#0ea5e9', '#a855f7', '#22c55e', '#f97316', '#ef4444'].map((color) => (
                  <motion.button
                    key={color}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-xl transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-6">
            <div className="glass-card-light p-6">
              <h4 className="text-lg font-semibold text-white mb-4">API Keys</h4>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">Production Key</span>
                    <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-xs">Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm text-gray-400 bg-black/30 px-3 py-2 rounded-lg">
                      sk_live_51M...xyz
                    </code>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </motion.button>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">Test Key</span>
                    <span className="px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs">Test</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm text-gray-400 bg-black/30 px-3 py-2 rounded-lg">
                      sk_test_51M...abc
                    </code>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </motion.button>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-4 btn-secondary w-full"
              >
                Generate New Key
              </motion.button>
            </div>

            <div className="glass-card-light p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Webhooks</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Webhook URL
                  </label>
                  <input type="url" placeholder="https://your-app.com/webhook" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Secret Key
                  </label>
                  <input type="text" placeholder="whsec_..." className="input-field" />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-4xl font-display font-bold mb-2">
          Settings
        </h1>
        <p className="text-gray-400">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="glass-card p-4 h-fit">
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-primary-600/20 to-accent-600/20 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                  {activeTab === tab.id && (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </motion.button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="lg:col-span-3 glass-card p-8"
        >
          {renderContent()}

          {/* Save Button */}
          <div className="flex gap-4 mt-8 pt-8 border-t border-white/10">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-secondary flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Settings;
