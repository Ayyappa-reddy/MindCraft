# Judge0 CE API Setup Instructions

This document explains how to set up the Judge0 CE API for code execution in the MindCraft exam system.

## Overview

The coding exam feature uses Judge0 CE (Compiler Explorer) API via RapidAPI to compile and execute student code in multiple programming languages.

## Important: Rate Limit Consideration

⚠️ **Critical**: The free RapidAPI tier gives you **50 submissions per day**. Since each test case uses one submission, a single coding question with 5 test cases can only be run **10 times per day** (50 ÷ 5 = 10 runs).

**For production use, strongly consider self-hosting Judge0** (see option 2 below).

## Setup Options

### Option 1: Using RapidAPI (Quick Start, Limited)

Follow steps 1-3 below. 50 submissions/day on free tier.

### Option 2: Self-Hosting Judge0 (Recommended for Production)

Unlimited submissions, no rate limits. See the "Self-Hosting Setup" section below.

## Environment Variables Configuration

Add ONE of the following configurations to your `.env.local` file:

**For RapidAPI (Option 1):**
```env
NEXT_PUBLIC_JUDGE0_SELF_HOSTED=false
NEXT_PUBLIC_RAPIDAPI_KEY=your_rapidapi_key_here
NEXT_PUBLIC_JUDGE0_HOST=judge0-ce.p.rapidapi.com
```

**For Self-Hosted (Option 2):**
```env
NEXT_PUBLIC_JUDGE0_SELF_HOSTED=true
NEXT_PUBLIC_JUDGE0_HOST=your-oracle-cloud-ip:2358
NEXT_PUBLIC_RAPIDAPI_KEY=not_used
```

**For Self-Hosted with HTTPS/Domain:**
```env
NEXT_PUBLIC_JUDGE0_SELF_HOSTED=true
NEXT_PUBLIC_JUDGE0_HOST=https://judge0.yourdomain.com
NEXT_PUBLIC_RAPIDAPI_KEY=not_used
```

## Setup Steps for RapidAPI

### 1. Get RapidAPI Key

1. Go to [RapidAPI](https://rapidapi.com/)
2. Sign up or log in to your account
3. Subscribe to the **Judge0 CE** API:
   - Go to https://rapidapi.com/judge0-official/api/judge0-ce
   - Click "Subscribe to Test"
   - Choose a plan (there's a free tier available with 50 requests/day)
   - Copy your **X-RapidAPI-Key**

### 2. Configure Environment Variables

Add the RapidAPI configuration to your `.env.local` file (see "Environment Variables Configuration" section above).

Replace `your_rapidapi_key_here` with the key you copied from RapidAPI.

### 3. Supported Languages

The system supports the following programming languages:
- **Python 3** (Language ID: 71)
- **C++ (GCC 9.2.0)** (Language ID: 54)
- **JavaScript (Node.js)** (Language ID: 63)
- **Java (OpenJDK 13)** (Language ID: 62)
- **C (GCC 9.2.0)** (Language ID: 50)

### 4. Rate Limits

The Judge0 CE API has rate limits depending on your subscription:
- **Free tier**: 50 requests/day
- **Basic**: 100 requests/day
- **Pro**: Unlimited requests

To handle rate limits, the system executes test cases **sequentially** with a 500ms delay between each execution.

### 5. Database Migration

Run the following migration to add structured fields for coding questions:

```bash
# In Supabase SQL Editor
supabase/migrations/012_add_structured_coding_fields.sql
```

This adds optional fields like `title`, `input_format`, `output_format`, `examples`, and `constraints` to the `questions` table.

### 6. Test the Setup

1. Create a coding question in the admin panel
2. Add test cases (visible and hidden)
3. Start an exam as a student
4. Write code and click "Run Code"
5. Verify that test cases execute and results are displayed

## Troubleshooting

### Error: "Judge0 API key not found"
- Make sure you've added `NEXT_PUBLIC_RAPIDAPI_KEY` to `.env.local`
- Restart your Next.js development server

### Error: "Too Many Requests"
- You've hit the rate limit for your subscription
- Upgrade your RapidAPI plan or wait until the limit resets

### Error: "Compilation Error"
- Check the console output for detailed error messages
- Verify that the code syntax is correct for the selected language

### Slow Execution
- The 500ms delay between test cases is intentional to avoid rate limiting
- For exams with many test cases, consider upgrading to a higher RapidAPI tier

## API Response Format

Judge0 returns the following for each submission:

```json
{
  "stdout": "output text",
  "stderr": "error text",
  "status": {
    "id": 3,
    "description": "Accepted"
  },
  "time": "0.002",
  "memory": 5120,
  "compile_output": "compilation output if any"
}
```

### Status Codes
- **3**: Accepted (code ran successfully)
- **4**: Wrong Answer
- **5**: Time Limit Exceeded
- **6**: Compilation Error
- **7+**: Runtime errors (SIGSEGV, SIGFPE, etc.)

## Security Notes

- The API key is prefixed with `NEXT_PUBLIC_` because it's used in client-side code
- Code execution happens on Judge0's secure sandbox environment
- Student code cannot access the file system or network
- All API calls are logged for monitoring

## Self-Hosting Setup (Recommended for Production)

If you need unlimited submissions without daily limits, self-hosting Judge0 CE is the best solution.

### Option A: Oracle Cloud Always Free Tier (RECOMMENDED)

**Why Oracle Cloud?**
- ✅ Truly free forever (no credit card charges)
- ✅ Always-on VMs (no cold starts)
- ✅ Generous resources: Up to 4 ARM cores + 24GB RAM OR 2 AMD cores + 2GB RAM
- ✅ Unlimited bandwidth (10TB/month outbound)
- ✅ Perfect for Judge0 deployment

#### Step 1: Create Oracle Cloud Account

1. Go to [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
2. Click "Start for free"
3. Fill in your details (requires email verification)
4. Add payment method (for verification only - won't be charged on Always Free resources)
5. Complete verification process

#### Step 2: Create a VM Instance

1. Log in to [Oracle Cloud Console](https://cloud.oracle.com/)
2. Click **"Create a VM instance"** or go to **Compute > Instances > Create Instance**

**Instance Configuration:**
- **Name**: `judge0-server` (or your preferred name)
- **Compartment**: Leave as default (root)
- **Availability Domain**: Choose any (doesn't matter for free tier)

**Image and Shape:**
- **Image**: Oracle Linux 8 (recommended) or Ubuntu 22.04
- **Shape**: 
  - For ARM: `VM.Standard.A1.Flex` (4 OCPUs, 24GB RAM) - RECOMMENDED
  - For AMD: `VM.Standard.E2.1.Micro` (1 OCPU, 1GB RAM) - works but less powerful
- Click "Change shape" and select "Ampere" for ARM or "Specialty and previous generation" for AMD

**Networking:**
- **Virtual Cloud Network**: Create new VCN (or use existing)
- **Subnet**: Create new subnet (or use existing)
- **Assign a public IPv4 address**: ✅ YES (check this box)

**Add SSH Keys:**
- Generate SSH key pair or upload your public key
- Download the private key if generating new (you'll need this to access the server)

**Boot Volume**: Leave defaults (50GB is plenty)

3. Click **"Create"** and wait 1-2 minutes for the VM to provision

4. **Note down the Public IP address** from the instance details page

#### Step 3: Configure Firewall Rules

**A. In Oracle Cloud Console:**

1. Go to **Networking > Virtual Cloud Networks**
2. Click on your VCN name
3. Click on **"Default Security List"**
4. Click **"Add Ingress Rules"**
5. Add the following rule:

```
Source CIDR: 0.0.0.0/0
IP Protocol: TCP
Destination Port Range: 2358
Description: Judge0 API
```

6. Click "Add Ingress Rules"

**B. On the VM (via SSH):**

1. Connect to your VM using SSH:
```bash
ssh -i /path/to/your/private-key.pem opc@YOUR_PUBLIC_IP
```

2. Configure iptables to allow port 2358:
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 2358 -j ACCEPT
sudo netfilter-persistent save
```

Or if using firewalld (Oracle Linux 8):
```bash
sudo firewall-cmd --permanent --add-port=2358/tcp
sudo firewall-cmd --reload
```

#### Step 4: Install Docker and Docker Compose

```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker docker-compose

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group
sudo usermod -aG docker $USER

# Apply group changes (or logout/login)
newgrp docker

# Verify Docker installation
docker --version
docker-compose --version
```

For Ubuntu, use these commands instead:
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
newgrp docker
```

#### Step 5: Deploy Judge0

1. Clone Judge0 repository:
```bash
cd ~
git clone https://github.com/judge0/judge0.git
cd judge0
```

2. Create a `docker-compose.yml` file (or use the one in the repo):
```bash
# The repo already has docker-compose files
# Use the production configuration
cp docker-compose.yml docker-compose.prod.yml
```

3. Generate secure passwords:
```bash
# Install pwgen if not available
sudo yum install -y pwgen  # Oracle Linux
# OR
sudo apt install -y pwgen  # Ubuntu

# Generate passwords
REDIS_PASSWORD=$(pwgen 32 1)
POSTGRES_PASSWORD=$(pwgen 32 1)

echo "REDIS_PASSWORD: $REDIS_PASSWORD"
echo "POSTGRES_PASSWORD: $POSTGRES_PASSWORD"
```

4. Create `.env` file:
```bash
cat > .env << EOF
REDIS_PASSWORD=$REDIS_PASSWORD
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
EOF
```

5. Start Judge0 services:
```bash
docker-compose up -d
```

6. Check if services are running:
```bash
docker-compose ps
```

You should see containers running: `judge0-server`, `judge0-workers`, `db`, `redis`

7. Wait 2-3 minutes for all services to initialize

8. Test the API:
```bash
curl http://localhost:2358/about
```

You should see JSON response with Judge0 version info.

#### Step 6: Test External Access

From your local machine:
```bash
curl http://YOUR_PUBLIC_IP:2358/about
```

If this works, your Judge0 instance is publicly accessible!

#### Step 7: Configure MindCraft Application

Update your `.env.local` (see "Environment Variables Configuration" section at the top):

Replace `YOUR_PUBLIC_IP` with your Oracle Cloud VM's public IP address, for example:
```env
NEXT_PUBLIC_JUDGE0_HOST=123.45.67.89:2358
```

#### Step 8: Optional - Set Up Domain and HTTPS

**Using Cloudflare (Free):**

1. Point your domain to Oracle Cloud public IP in Cloudflare DNS
2. Enable Cloudflare proxy (orange cloud icon)
3. Cloudflare will automatically provide SSL/TLS
4. Update `.env.local` to use your domain:
```env
NEXT_PUBLIC_JUDGE0_HOST=judge0.yourdomain.com
```

**Using Let's Encrypt (Free):**

1. Install Nginx:
```bash
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

2. Install Certbot:
```bash
sudo yum install -y certbot python3-certbot-nginx
```

3. Get SSL certificate:
```bash
sudo certbot --nginx -d yourdomain.com
```

4. Configure Nginx reverse proxy:
```nginx
# /etc/nginx/conf.d/judge0.conf
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:2358;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

5. Reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Option B: Local Development Setup

For local testing only:

#### Prerequisites
- Docker and Docker Compose installed
- At least 4GB RAM

#### Quick Start

1. Clone the Judge0 repository:
```bash
git clone https://github.com/judge0/judge0.git
cd judge0
```

2. Start Judge0 using Docker Compose:
```bash
docker-compose up -d
```

3. Wait for services to start (takes 2-3 minutes on first run)

4. Access Judge0 API at `http://localhost:2358`

5. Update `.env.local` (see "Environment Variables Configuration" section at the top)

### Monitoring and Maintenance

**Check logs:**
```bash
cd ~/judge0
docker-compose logs -f
```

**Restart services:**
```bash
docker-compose restart
```

**Update Judge0:**
```bash
cd ~/judge0
git pull
docker-compose pull
docker-compose up -d
```

**Resource monitoring:**
```bash
docker stats
```

**Backup database:**
```bash
docker exec judge0-db pg_dump -U judge0 judge0 > backup.sql
```

### Troubleshooting

**Container won't start:**
```bash
docker-compose logs judge0-server
```

**Can't access from internet:**
- Check Oracle Cloud security list rules
- Check VM firewall (iptables/firewalld)
- Verify public IP is correct

**Out of memory:**
- Oracle Cloud free tier ARM instances have 24GB RAM - more than enough
- If using AMD instance (1GB), consider upgrading to ARM

**Port already in use:**
```bash
sudo lsof -i :2358
# Kill the process if needed
```

## Alternative: Batch Submissions

Judge0 supports batch submissions (multiple test cases in one API call). While this doesn't reduce the submission count, it reduces the number of HTTP requests. Check the Judge0 API docs for batch endpoint.

## Additional Resources

- [Judge0 CE Documentation](https://ce.judge0.com/)
- [Judge0 GitHub](https://github.com/judge0/judge0)
- [RapidAPI Judge0 CE Page](https://rapidapi.com/judge0-official/api/judge0-ce)
- [Supported Languages List](https://ce.judge0.com/#supported-languages)

