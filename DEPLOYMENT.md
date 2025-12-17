# Deployment Guide

## Production Deployment Options

### Option 1: Traditional VPS (DigitalOcean, AWS EC2, etc.)

#### Prerequisites
- Ubuntu 20.04+ server
- Domain name (optional)
- SSL certificate (Let's Encrypt)

#### Steps

1. **Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2
```

2. **Clone and Setup Application**
```bash
# Clone repository
git clone <your-repo-url> /var/www/hiring-drive
cd /var/www/hiring-drive

# Install dependencies
npm run install-all

# Build client
cd client
npm run build
cd ..
```

3. **Configure Environment**
```bash
# Server .env
cat > server/.env << EOF
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hiring-drive
NODE_ENV=production
EOF
```

4. **Start Backend with PM2**
```bash
cd server
pm2 start npm --name "hiring-drive-api" -- start
pm2 save
pm2 startup
```

5. **Configure Nginx**
```bash
sudo nano /etc/nginx/sites-available/hiring-drive
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/hiring-drive/client/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/hiring-drive /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

6. **Setup SSL (Optional but Recommended)**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Option 2: Docker Deployment

#### Create Dockerfiles

**server/Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

**client/Dockerfile**
```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**client/nginx.conf**
```nginx
server {
    listen 80;
    
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://server:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**docker-compose.yml** (root directory)
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: hiring-drive-db
    restart: always
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: hiring-drive

  server:
    build: ./server
    container_name: hiring-drive-api
    restart: always
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - MONGODB_URI=mongodb://mongodb:27017/hiring-drive
      - NODE_ENV=production
    depends_on:
      - mongodb

  client:
    build: ./client
    container_name: hiring-drive-web
    restart: always
    ports:
      - "80:80"
    depends_on:
      - server

volumes:
  mongodb_data:
```

**Deploy with Docker Compose**
```bash
docker-compose up -d
```

### Option 3: Heroku Deployment

#### Backend (Heroku)

1. **Create Heroku App**
```bash
heroku create hiring-drive-api
```

2. **Add MongoDB Atlas**
```bash
# Sign up for MongoDB Atlas (free tier)
# Get connection string
heroku config:set MONGODB_URI="mongodb+srv://..."
```

3. **Deploy**
```bash
cd server
git init
heroku git:remote -a hiring-drive-api
git add .
git commit -m "Deploy"
git push heroku main
```

#### Frontend (Netlify/Vercel)

**Netlify:**
```bash
cd client
npm run build
netlify deploy --prod --dir=build
```

**Vercel:**
```bash
cd client
vercel --prod
```

Update `client/.env`:
```
REACT_APP_API_URL=https://hiring-drive-api.herokuapp.com/api
```

### Option 4: AWS Deployment

#### Using AWS Elastic Beanstalk

1. **Install EB CLI**
```bash
pip install awsebcli
```

2. **Initialize**
```bash
cd server
eb init
```

3. **Create Environment**
```bash
eb create hiring-drive-prod
```

4. **Deploy**
```bash
eb deploy
```

#### Using AWS Amplify (Frontend)
```bash
cd client
amplify init
amplify add hosting
amplify publish
```

### Option 5: Kubernetes (Advanced)

**kubernetes/deployment.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hiring-drive-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hiring-drive-api
  template:
    metadata:
      labels:
        app: hiring-drive-api
    spec:
      containers:
      - name: api
        image: your-registry/hiring-drive-api:latest
        ports:
        - containerPort: 5000
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: hiring-drive-secrets
              key: mongodb-uri
---
apiVersion: v1
kind: Service
metadata:
  name: hiring-drive-api
spec:
  selector:
    app: hiring-drive-api
  ports:
  - port: 80
    targetPort: 5000
  type: LoadBalancer
```

## Environment Variables

### Production Server
```env
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hiring-drive
NODE_ENV=production
```

### Production Client
```env
REACT_APP_API_URL=https://api.your-domain.com/api
```

## Database Backup

### Manual Backup
```bash
mongodump --uri="mongodb://localhost:27017/hiring-drive" --out=/backup/$(date +%Y%m%d)
```

### Automated Backup (Cron)
```bash
# Add to crontab
0 2 * * * mongodump --uri="mongodb://localhost:27017/hiring-drive" --out=/backup/$(date +\%Y\%m\%d)
```

### Restore
```bash
mongorestore --uri="mongodb://localhost:27017/hiring-drive" /backup/20240101
```

## Monitoring

### PM2 Monitoring
```bash
pm2 monit
pm2 logs
pm2 status
```

### Log Management
```bash
# View logs
pm2 logs hiring-drive-api

# Clear logs
pm2 flush

# Setup log rotation
pm2 install pm2-logrotate
```

### Health Checks
```bash
# API health
curl https://your-domain.com/api/health

# Response time
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/api/health
```

**curl-format.txt**
```
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
```

## Performance Optimization

### Backend
1. **Enable compression**
```typescript
import compression from 'compression';
app.use(compression());
```

2. **Add caching**
```typescript
import redis from 'redis';
const client = redis.createClient();
```

3. **Database indexing**
```typescript
// In model
candidateEmail: { type: String, required: true, index: true }
```

### Frontend
1. **Code splitting**
```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'));
```

2. **Image optimization**
3. **CDN for static assets**
4. **Service worker for caching**

## Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] MongoDB authentication enabled
- [ ] Rate limiting implemented
- [ ] CORS configured properly
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (using Mongoose)
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Helmet.js configured
- [ ] Regular dependency updates
- [ ] Security headers set

### Add Security Middleware
```typescript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api', limiter);
```

## Scaling Strategies

### Horizontal Scaling
- Load balancer (Nginx/HAProxy)
- Multiple server instances
- Session management (Redis)
- Database replication

### Vertical Scaling
- Increase server resources
- Optimize queries
- Add caching layer
- Database indexing

### Database Scaling
- MongoDB sharding
- Read replicas
- Connection pooling
- Query optimization

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection string
echo $MONGODB_URI

# Test connection
mongosh $MONGODB_URI
```

**Port Already in Use**
```bash
# Find process
lsof -i :5000

# Kill process
kill -9 <PID>
```

**Build Fails**
```bash
# Clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**High Memory Usage**
```bash
# Check PM2 processes
pm2 status

# Restart app
pm2 restart hiring-drive-api

# Increase memory limit
pm2 start npm --name "hiring-drive-api" --max-memory-restart 500M -- start
```

## Maintenance

### Regular Tasks
- [ ] Weekly: Check logs for errors
- [ ] Weekly: Monitor disk space
- [ ] Weekly: Check API response times
- [ ] Monthly: Update dependencies
- [ ] Monthly: Review security advisories
- [ ] Monthly: Database backup verification
- [ ] Quarterly: Performance audit
- [ ] Quarterly: Security audit

### Update Process
```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build
npm run build

# Restart
pm2 restart hiring-drive-api
```

## Rollback Plan

```bash
# Tag current version
git tag -a v1.0.0 -m "Version 1.0.0"

# If issues occur, rollback
git checkout v1.0.0
npm install
npm run build
pm2 restart hiring-drive-api
```

## Cost Estimation

### Small Scale (< 100 users)
- VPS: $5-10/month (DigitalOcean, Linode)
- MongoDB Atlas: Free tier
- Domain: $10/year
- SSL: Free (Let's Encrypt)
**Total: ~$10/month**

### Medium Scale (< 1000 users)
- VPS: $20-40/month
- MongoDB Atlas: $25/month
- CDN: $10/month
- Domain: $10/year
**Total: ~$60/month**

### Large Scale (< 10000 users)
- Load Balancer: $20/month
- App Servers (3x): $120/month
- MongoDB Cluster: $100/month
- CDN: $50/month
- Monitoring: $20/month
**Total: ~$310/month**

## Support Contacts

- MongoDB Atlas: https://support.mongodb.com
- Heroku: https://help.heroku.com
- AWS: https://aws.amazon.com/support
- DigitalOcean: https://www.digitalocean.com/support

---

**Recommendation for Quick Deployment:**
Start with Option 1 (VPS) or Option 2 (Docker) for simplicity and cost-effectiveness. Scale to Kubernetes when you have 10,000+ concurrent users.

