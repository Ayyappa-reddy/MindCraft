# Oracle Cloud Judge0 Quick Start Guide

This is a quick reference guide for setting up Judge0 on Oracle Cloud Always Free Tier.

## Why Oracle Cloud?

✅ **Truly free forever** - No time limits, no credit card charges  
✅ **No cold starts** - VM runs 24/7  
✅ **Generous resources** - 4 ARM cores + 24GB RAM  
✅ **Unlimited submissions** - No daily rate limits  
✅ **10TB bandwidth/month** - More than enough for coding exams  

## Quick Setup Checklist

- [ ] Create Oracle Cloud account
- [ ] Create VM instance (ARM recommended)
- [ ] Configure firewall (port 2358)
- [ ] Install Docker & Docker Compose
- [ ] Deploy Judge0
- [ ] Test API access
- [ ] Update MindCraft `.env.local`
- [ ] Test from MindCraft app

## Step-by-Step Commands

### 1. Create Account
Go to: https://www.oracle.com/cloud/free/

### 2. Create VM Instance
- **Shape**: VM.Standard.A1.Flex (ARM - 4 cores, 24GB RAM)
- **Image**: Oracle Linux 8
- **Network**: Enable public IP
- **SSH**: Generate and download key

### 3. Connect to VM
```bash
ssh -i /path/to/private-key.pem opc@YOUR_PUBLIC_IP
```

### 4. Configure Firewall on VM
```bash
# For Oracle Linux 8 (firewalld)
sudo firewall-cmd --permanent --add-port=2358/tcp
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-ports
```

### 5. Install Docker
```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker docker-compose

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
```

### 6. Deploy Judge0
```bash
# Clone repository
cd ~
git clone https://github.com/judge0/judge0.git
cd judge0

# Generate passwords
sudo yum install -y pwgen
REDIS_PASSWORD=$(pwgen 32 1)
POSTGRES_PASSWORD=$(pwgen 32 1)

# Create .env file
cat > .env << EOF
REDIS_PASSWORD=$REDIS_PASSWORD
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
EOF

# Start services
docker-compose up -d

# Wait 2-3 minutes, then check
docker-compose ps
```

### 7. Test API
```bash
# On VM
curl http://localhost:2358/about

# From your local machine
curl http://YOUR_PUBLIC_IP:2358/about
```

If both work, you're good! ✅

### 8. Configure MindCraft
Update `.env.local`:
```env
NEXT_PUBLIC_JUDGE0_SELF_HOSTED=true
NEXT_PUBLIC_JUDGE0_HOST=YOUR_PUBLIC_IP:2358
NEXT_PUBLIC_RAPIDAPI_KEY=not_used
```

Replace `YOUR_PUBLIC_IP` with your actual IP (e.g., `123.45.67.89:2358`)

### 9. Restart MindCraft Dev Server
```bash
# Stop current server (Ctrl+C)
# Start again
npm run dev
```

## Oracle Cloud Console - Add Ingress Rule

Don't forget to add the ingress rule in Oracle Cloud Console:

1. Go to: **Networking > Virtual Cloud Networks**
2. Click your VCN
3. Click **"Default Security List"**
4. Click **"Add Ingress Rules"**
5. Fill in:
   - **Source CIDR**: 0.0.0.0/0
   - **IP Protocol**: TCP
   - **Destination Port**: 2358
   - **Description**: Judge0 API
6. Click **"Add Ingress Rules"**

## Troubleshooting

### Can't connect to VM via SSH
```bash
# Make sure key has correct permissions
chmod 400 /path/to/private-key.pem

# Try verbose mode
ssh -v -i /path/to/private-key.pem opc@YOUR_PUBLIC_IP
```

### Can't access API from internet
1. Check Oracle Cloud security list (ingress rule for 2358)
2. Check VM firewall: `sudo firewall-cmd --list-ports`
3. Check Docker is running: `docker-compose ps`
4. Check API locally: `curl http://localhost:2358/about`

### Docker permission denied
```bash
# Re-add to docker group
sudo usermod -aG docker $USER
newgrp docker

# Or logout/login via SSH
```

### Services not starting
```bash
# Check logs
cd ~/judge0
docker-compose logs

# Restart
docker-compose down
docker-compose up -d
```

### Out of memory (unlikely with 24GB RAM)
```bash
# Check usage
docker stats

# Check VM resources
free -h
top
```

## Maintenance

### View logs
```bash
cd ~/judge0
docker-compose logs -f
```

### Restart services
```bash
cd ~/judge0
docker-compose restart
```

### Update Judge0
```bash
cd ~/judge0
git pull
docker-compose pull
docker-compose up -d
```

### Stop services (to save resources)
```bash
cd ~/judge0
docker-compose down
```

### Start services again
```bash
cd ~/judge0
docker-compose up -d
```

## Resources

- Full documentation: See `JUDGE0_SETUP.md`
- Oracle Cloud Console: https://cloud.oracle.com/
- Judge0 GitHub: https://github.com/judge0/judge0
- Judge0 Docs: https://ce.judge0.com/

## Need Help?

1. Check `JUDGE0_SETUP.md` for detailed instructions
2. Check Docker logs: `docker-compose logs`
3. Verify firewall rules in Oracle Cloud Console
4. Test API locally first: `curl http://localhost:2358/about`
5. Then test externally: `curl http://YOUR_PUBLIC_IP:2358/about`

## Estimated Setup Time

- Oracle account creation: 10 minutes
- VM provisioning: 2 minutes
- Docker installation: 5 minutes
- Judge0 deployment: 5 minutes
- **Total: ~25 minutes**

Good luck! 🚀

