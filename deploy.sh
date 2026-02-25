#!/bin/bash
set -e

echo "========================================="
echo "  Comgini Backend - EC2 Deployment Script"
echo "========================================="

# ---- CONFIGURATION ----
DB_NAME="comgini_db"
DB_USER="comgini_user"
DB_PASSWORD="ComGini@2026Secure!"  # CHANGE THIS to a strong password
APP_PORT=3000
REPO_URL="https://github.com/sitannsu/ComginiBackend.git"
APP_DIR="/home/ec2-user/ComginiBackend"

# ---- 1. SYSTEM UPDATE ----
echo ""
echo "📦 Step 1: Updating system packages..."
sudo yum update -y

# ---- 2. INSTALL MYSQL ----
echo ""
echo "🐬 Step 2: Installing MySQL..."

# Check if MySQL is already installed
if command -v mysql &> /dev/null; then
    echo "✅ MySQL is already installed"
else
    # Install MySQL 8.0 community server
    sudo yum install -y https://dev.mysql.com/get/mysql80-community-release-el9-1.noarch.rpm 2>/dev/null || \
    sudo yum install -y https://dev.mysql.com/get/mysql80-community-release-el7-11.noarch.rpm 2>/dev/null || \
    sudo amazon-linux-extras install mysql8.0 -y 2>/dev/null || \
    sudo dnf install -y mysql-community-server 2>/dev/null || \
    sudo yum install -y mysql-community-server 2>/dev/null || \
    sudo yum install -y mariadb105-server 2>/dev/null || \
    sudo yum install -y mariadb-server 2>/dev/null
    echo "✅ MySQL/MariaDB installed"
fi

# Start and enable MySQL
sudo systemctl start mysqld 2>/dev/null || sudo systemctl start mariadb 2>/dev/null || sudo systemctl start mysql 2>/dev/null
sudo systemctl enable mysqld 2>/dev/null || sudo systemctl enable mariadb 2>/dev/null || sudo systemctl enable mysql 2>/dev/null
echo "✅ MySQL service started and enabled"

# ---- 3. CONFIGURE MYSQL DATABASE & USER ----
echo ""
echo "🗄️  Step 3: Setting up MySQL database and user..."

# For fresh MySQL 8.0 install, get temporary password
TEMP_PASS=$(sudo grep 'temporary password' /var/log/mysqld.log 2>/dev/null | tail -1 | awk '{print $NF}') || true

if [ -n "$TEMP_PASS" ]; then
    echo "Found temporary MySQL root password. Resetting..."
    # Reset root password for MySQL 8.0
    mysql -u root -p"$TEMP_PASS" --connect-expired-password -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';" 2>/dev/null || true
    MYSQL_CMD="mysql -u root -p${DB_PASSWORD}"
else
    # Try connecting without password (MariaDB / fresh install)
    MYSQL_CMD="mysql -u root"
    # Test if it works
    $MYSQL_CMD -e "SELECT 1;" 2>/dev/null || {
        echo "⚠️  Cannot connect to MySQL as root without password."
        echo "Please set up MySQL root access manually, then re-run this script."
        exit 1
    }
fi

# Create database and user
$MYSQL_CMD -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};" 2>/dev/null
$MYSQL_CMD -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';" 2>/dev/null || \
$MYSQL_CMD -e "CREATE USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';" 2>/dev/null || true
$MYSQL_CMD -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';" 2>/dev/null
$MYSQL_CMD -e "FLUSH PRIVILEGES;" 2>/dev/null
echo "✅ Database '${DB_NAME}' and user '${DB_USER}' created"

# ---- 4. INSTALL NODE.JS ----
echo ""
echo "🟢 Step 4: Installing Node.js..."

if command -v node &> /dev/null; then
    echo "✅ Node.js is already installed: $(node -v)"
else
    # Install Node.js 18 LTS via nvm
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 18
    nvm use 18
    nvm alias default 18
    echo "✅ Node.js installed: $(node -v)"
fi

# Ensure nvm is loaded
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# ---- 5. INSTALL GIT ----
echo ""
echo "📂 Step 5: Installing Git..."
sudo yum install -y git
echo "✅ Git installed"

# ---- 6. CLONE REPO ----
echo ""
echo "📥 Step 6: Cloning repository..."

if [ -d "$APP_DIR" ]; then
    echo "Directory exists, pulling latest..."
    cd "$APP_DIR"
    git pull origin main
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi
echo "✅ Repository cloned"

# ---- 7. INSTALL DEPENDENCIES ----
echo ""
echo "📦 Step 7: Installing Node.js dependencies..."
cd "$APP_DIR"
npm install
echo "✅ Dependencies installed"

# ---- 8. CREATE .env FILE ----
echo ""
echo "⚙️  Step 8: Creating .env file..."

cat > "$APP_DIR/.env" << EOF
# Server
NODE_ENV=production
PORT=${APP_PORT}
API_VERSION=v1

# Database (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# JWT Secrets - CHANGE THESE in production!
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Email (configure your SMTP settings)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=noreply@comgini.com

# Frontend URL (for password reset links)
FRONTEND_URL=http://13.126.81.144
EOF

echo "✅ .env file created"

# ---- 9. RUN MIGRATIONS ----
echo ""
echo "🗃️  Step 9: Running database migrations..."
cd "$APP_DIR"
npm run migrate
echo "✅ Migrations complete"

# ---- 10. INSTALL PM2 (Process Manager) ----
echo ""
echo "🔄 Step 10: Installing PM2 process manager..."
npm install -g pm2

# Stop existing app if running
pm2 stop comgini-backend 2>/dev/null || true
pm2 delete comgini-backend 2>/dev/null || true

# Start the app
pm2 start src/server.js --name comgini-backend
pm2 save
pm2 startup 2>/dev/null || true

echo "✅ Application started with PM2"

# ---- 11. OPEN FIREWALL PORT ----
echo ""
echo "🔥 Step 11: Note about Security Group..."
echo "⚠️  Make sure your EC2 Security Group allows inbound traffic on port ${APP_PORT}"
echo "    - Go to EC2 Console → Security Groups → Edit Inbound Rules"
echo "    - Add rule: Custom TCP, Port ${APP_PORT}, Source 0.0.0.0/0"

echo ""
echo "========================================="
echo "  ✅ DEPLOYMENT COMPLETE!"
echo "========================================="
echo ""
echo "🔗 API URL: http://13.126.81.144:${APP_PORT}/api/v1"
echo "📋 Health check: http://13.126.81.144:${APP_PORT}/api/v1/auth/profile"
echo ""
echo "📌 Useful commands:"
echo "   pm2 status          - Check app status"
echo "   pm2 logs            - View logs"
echo "   pm2 restart all     - Restart app"
echo "   npm run create-test-user  - Create a test user"
echo ""
