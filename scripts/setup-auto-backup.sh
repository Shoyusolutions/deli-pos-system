#!/bin/bash

# Setup automatic daily backups for the POS system

echo "=== SETTING UP AUTOMATIC DAILY BACKUPS ==="
echo ""

# Get the full path to the backup script
SCRIPT_PATH="/Users/franklinreitzas/deli_pos_system/scripts/backup-database.js"
NODE_PATH=$(which node)

# Create a launch agent plist for macOS
PLIST_PATH="$HOME/Library/LaunchAgents/com.delipos.backup.plist"

cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.delipos.backup</string>

    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$SCRIPT_PATH</string>
    </array>

    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>23</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>

    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/delipos-backup.log</string>

    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/delipos-backup.error.log</string>

    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
EOF

# Load the launch agent
launchctl unload "$PLIST_PATH" 2>/dev/null
launchctl load "$PLIST_PATH"

echo "✅ Automatic backup scheduled!"
echo ""
echo "📅 Backup Schedule:"
echo "   - Daily at 11:00 PM"
echo "   - Backups saved to: /Users/franklinreitzas/deli_pos_system/backups/"
echo "   - Keeps last 30 days of backups"
echo ""
echo "📝 Log files:"
echo "   - $HOME/Library/Logs/delipos-backup.log"
echo "   - $HOME/Library/Logs/delipos-backup.error.log"
echo ""
echo "🛠️  To disable automatic backups, run:"
echo "   launchctl unload $PLIST_PATH"
echo ""
echo "🔄 To run a backup manually, run:"
echo "   node /Users/franklinreitzas/deli_pos_system/scripts/backup-database.js"