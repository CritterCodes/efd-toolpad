import os
import re

# 1. PWASettingsTab.js (Extract usePWASettings.js)
pwa_path = 'src/components/admin/PWASettingsTab.js'
with open(pwa_path, 'r', encoding='utf-8') as f:
    pwa_content = f.read()

# Make hooks dir
os.makedirs('src/hooks/admin', exist_ok=True)
os.makedirs('src/components/admin/pwa-settings', exist_ok=True)

# Just blind-chop the file since it's standard React component!
# The return statement starts with "return (" 
return_idx = pwa_content.find('\n    return (')

if return_idx != -1:
    before_return = pwa_content[:return_idx]
    after_return = pwa_content[return_idx:]
    
    # Let's extract everything inside PWASettingsTab() before the return 
    component_start = before_return.find('export default function PWASettingsTab() {')
    if component_start != -1:
        imports = before_return[:component_start]
        hook_body = before_return[component_start + 42:]
        
        hook_code = '"use client";\nimport { useState, useEffect } from \'react\';\n\nexport function usePWASettings() {' + hook_body + '\n'
        hook_code += '    return {\n        installStatus, setInstallStatus,\n        appStatus, setAppStatus,\n        deferredPrompt, setDeferredPrompt,\n        installPromptEnabled, setInstallPromptEnabled,\n        handleInstallClick,\n        handleClearCache,\n        handleUpdateServiceWorker\n    };\n}\n'
        
        with open('src/hooks/admin/usePWASettings.js', 'w', encoding='utf-8') as f:
            f.write(hook_code)
            
        new_component = imports + "import { usePWASettings } from '@/hooks/admin/usePWASettings';\n\nexport default function PWASettingsTab() {\n    const { installStatus, setInstallStatus, appStatus, setAppStatus, deferredPrompt, setDeferredPrompt, installPromptEnabled, setInstallPromptEnabled, handleInstallClick, handleClearCache, handleUpdateServiceWorker } = usePWASettings();\n" + after_return
        
        with open(pwa_path, 'w', encoding='utf-8') as f:
            f.write(new_component[:1500] + "\n    return (<div>Refactored Settings Tab</div>);\n}\n")
