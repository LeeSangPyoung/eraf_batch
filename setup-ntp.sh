#!/bin/bash
# NTP Time Synchronization Setup Script for Worker Servers
# Run as root: sudo bash setup-ntp.sh

echo "=== NTP Time Sync Setup ==="

# Detect OS type
if [ -f /etc/redhat-release ]; then
    OS="rhel"
    echo "Detected: RHEL/CentOS/Rocky Linux"
elif [ -f /etc/debian_version ]; then
    OS="debian"
    echo "Detected: Debian/Ubuntu"
else
    echo "Unknown OS. Trying generic approach..."
    OS="unknown"
fi

# Install chrony
echo ""
echo "Installing chrony..."
if [ "$OS" = "rhel" ]; then
    yum install -y chrony
elif [ "$OS" = "debian" ]; then
    apt-get update && apt-get install -y chrony
else
    # Try both
    yum install -y chrony 2>/dev/null || apt-get install -y chrony 2>/dev/null
fi

# Configure chrony for Korean NTP servers
echo ""
echo "Configuring chrony..."
cat > /etc/chrony.conf << 'EOF'
# Korean NTP Servers
server time.bora.net iburst
server time.nuri.net iburst
server time.kriss.re.kr iburst
server time.google.com iburst

# Record the rate at which the system clock gains/losses time.
driftfile /var/lib/chrony/drift

# Allow the system clock to be stepped in the first three updates
makestep 1.0 3

# Enable kernel synchronization of the real-time clock (RTC).
rtcsync

# Serve time even if not synchronized to a time source.
local stratum 10

# Log files location
logdir /var/log/chrony
EOF

# Enable and start chrony service
echo ""
echo "Starting chrony service..."
systemctl enable chronyd
systemctl restart chronyd

# Force immediate sync
echo ""
echo "Forcing time sync..."
chronyc makestep

# Set timezone to Asia/Seoul
echo ""
echo "Setting timezone to Asia/Seoul..."
timedatectl set-timezone Asia/Seoul

# Enable NTP
timedatectl set-ntp true

# Show status
echo ""
echo "=== Current Status ==="
echo ""
echo "Time settings:"
timedatectl

echo ""
echo "Chrony sources:"
chronyc sources

echo ""
echo "Chrony tracking:"
chronyc tracking

echo ""
echo "=== Setup Complete ==="
echo "Current time: $(date)"
