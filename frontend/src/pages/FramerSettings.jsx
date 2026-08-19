import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield,
  CreditCard,
  Globe,
  Key,
  Save,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Zap,
  Palette,
  Sliders,
  Monitor,
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle
} from 'lucide-react';

const FramerSettings = () => {
  const settingsSections = [
    {
      title: 'Profile',
      icon: User,
      gradient: 'from-[#667eea] to-[#764ba2]',
      items: [
        { label: 'Personal Information', description: 'Update your profile details' },
        { label: 'Email Preferences', description: 'Manage email notifications' },
        { label: 'Security Settings', description: 'Password and 2FA settings' },
      ]
    },
    {
      title: 'Billing',
      icon: CreditCard,
      gradient: 'from-[#f093fb] to-[#f5576c]',
      items: [
        { label: 'Payment Methods', description: 'Manage payment options' },
        { label: 'Billing History', description: 'View past invoices' },
        { label: 'Subscription Plan', description: 'Upgrade or downgrade' },
      ]
    },
    {
      title: 'Notifications',
      icon: Bell,
      gradient: 'from-[#4facfe] to-[#00f2fe]',
      items: [
        { label: 'Push Notifications', description: 'Manage push alerts' },
        { label: 'Email Alerts', description: 'Configure email notifications' },
        { label: 'SMS Alerts', description: 'Text message preferences' },
      ]
    },
    {
      title: 'Security',
      icon: Shield,
      gradient: 'from-[#43e97b] to-[#38f9d7]',
      items: [
        { label: 'API Keys', description: 'Manage API access tokens' },
        { label: 'Webhooks', description: 'Configure webhook endpoints' },
        { label: 'Audit Logs', description: 'View security events' },
      ]
    },
  ];

  const appearanceSettings = [
    { label: 'Dark Mode', description: 'Use dark theme across the app', enabled: true },
    { label: 'Reduce Motion', description: 'Minimize animations', enabled: false },
    { label: 'Compact Mode', description: 'More compact UI layout', enabled: false },
    { label: 'High Contrast', description: 'Increase color contrast', enabled: false },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-display font-bold text-white mb-2">
            Settings
          </h1>
          <p className="text-neutral-400">Manage your account and preferences</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-xl font-medium shadow-lg shadow-[#667eea]/30"
        >
          <Save className="w-5 h-5" />
          <span>Save Changes</span>
        </motion.button>
      </motion.div>

      {/* Settings Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {settingsSections.map((section, index) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            className="group relative"
          >
            <div className="relative bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 p-6 overflow-hidden">
              {/* Gradient border glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              
              {/* Section Header */}
              <div className="relative z-10 flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${section.gradient} flex items-center justify-center shadow-lg`}>
                  <section.icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-display font-bold text-white">{section.title}</h2>
              </div>
              
              {/* Section Items */}
              <div className="relative z-10 space-y-3">
                {section.items.map((item, itemIndex) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + itemIndex * 0.1 }}
                    whileHover={{ x: 5 }}
                    className="flex items-center justify-between p-4 rounded-2xl bg-[#0a0a0a]/30 border border-white/5 hover:border-white/10 transition-all cursor-pointer group/item"
                  >
                    <div className="flex-1">
                      <div className="text-white font-medium mb-1">{item.label}</div>
                      <div className="text-sm text-neutral-400">{item.description}</div>
                    </div>
                    <motion.div
                      whileHover={{ x: 5 }}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-neutral-400" />
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Appearance Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileHover={{ y: -5 }}
        className="group relative"
      >
        <div className="relative bg-[#0a0a0a]/50 backdrop-blur-xl rounded-3xl border border-white/5 p-8 overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fa709a] to-[#fee140] flex items-center justify-center shadow-lg">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-white mb-1">Appearance</h2>
              <p className="text-sm text-neutral-400">Customize your interface</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {appearanceSettings.map((setting, index) => (
              <motion.div
                key={setting.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ x: 5 }}
                className="flex items-center justify-between p-4 rounded-2xl bg-[#0a0a0a]/30 border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex-1">
                  <div className="text-white font-medium mb-1">{setting.label}</div>
                  <div className="text-sm text-neutral-400">{setting.description}</div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  {setting.enabled ? (
                    <ToggleRight className="w-6 h-6 text-[#667eea]" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-neutral-400" />
                  )}
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative"
      >
        <div className="relative bg-[#f5576c]/5 backdrop-blur-xl rounded-3xl border border-[#f5576c]/20 p-8 overflow-hidden">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f5576c] to-[#f093fb] flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-white mb-1">Danger Zone</h2>
              <p className="text-sm text-neutral-400">Irreversible actions</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#f5576c]/10 border border-[#f5576c]/30 hover:border-[#f5576c]/50 transition-all"
            >
              <div className="text-left">
                <div className="text-white font-medium mb-1">Delete Account</div>
                <div className="text-sm text-neutral-400">Permanently delete your account and all data</div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#f5576c]" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#f5576c]/10 border border-[#f5576c]/30 hover:border-[#f5576c]/50 transition-all"
            >
              <div className="text-left">
                <div className="text-white font-medium mb-1">Export Data</div>
                <div className="text-sm text-neutral-400">Download all your data in JSON format</div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#f5576c]" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FramerSettings;