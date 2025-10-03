# GKE Deployment Guide

This guide explains how to deploy the Alpaca Trading App to Google Kubernetes Engine (GKE) using Helm charts.

## Prerequisites

1. **GKE Cluster**: You need a running GKE cluster
2. **Google Cloud SDK**: Install and configure `gcloud` CLI
3. **kubectl**: Configure to connect to your GKE cluster
4. **Helm**: Version 3.x installed locally
5. **Docker Images**: Backend, Frontend, and Nginx images built and pushed to a registry

## Repository Secrets Setup

Configure these secrets in your GitHub repository (Settings → Secrets → Actions):

### Required Secrets
- `GKE_SA_KEY`: Service Account JSON key with GKE deployment permissions
- `DOCKERHUB_USERNAME`: Docker Hub username (for image builds)
- `DOCKERHUB_TOKEN`: Docker Hub access token (for image builds)

### Optional Production Secrets (recommended)
- `PROD_POSTGRES_PASSWORD`: Production database password
- `PROD_DJANGO_SECRET_KEY`: Production Django secret key
- `PROD_ALPACA_API_KEY`: Production Alpaca API key
- `PROD_ALPACA_SECRET_KEY`: Production Alpaca secret key

## GKE Cluster Setup

### 1. Create GKE Cluster
```bash
# Create a GKE cluster
gcloud container clusters create alpaca-cluster \
    --zone us-central1-a \
    --num-nodes 3 \
    --enable-autoscaling \
    --min-nodes 1 \
    --max-nodes 10 \
    --machine-type e2-standard-2 \
    --enable-autorepair \
    --enable-autoupgrade

# Get credentials
gcloud container clusters get-credentials alpaca-cluster --zone us-central1-a
```

### 2. Create Static IP (for Production)
```bash
# Reserve a static IP for the ingress
gcloud compute addresses create alpaca-main-ip --global

# Get the IP address
gcloud compute addresses describe alpaca-main-ip --global
```

### 3. Create Managed SSL Certificate (for Production)
```bash
# Create managed certificate
gcloud compute ssl-certificates create alpaca-main-ssl-cert \
    --domains=alpaca.mnaveedk.com \
    --global
```

## Deployment Options

### Option 1: Manual Deployment via GitHub Actions (Recommended)

1. **Navigate to Actions tab** in your GitHub repository
2. **Select "Manual GKE Deployment"** workflow
3. **Click "Run workflow"** and configure:
   - **Environment**: `staging` or `production`
   - **Image Tag**: `latest` or specific SHA tag
   - **GKE Cluster**: Your cluster name (default: `alpaca-cluster`)
   - **GKE Zone**: Your cluster zone (default: `us-central1-a`)
   - **Namespace**: Kubernetes namespace (default: `default`)

### Option 2: Local Deployment

#### Staging Deployment
```bash
# Clone the repository
git clone https://github.com/naveedkhan1998/alpaca-main.git
cd alpaca-main

# Connect to your GKE cluster
gcloud container clusters get-credentials alpaca-cluster --zone us-central1-a

# Deploy to staging
helm upgrade --install alpaca-main charts/alpaca-main \
    --values charts/alpaca-main/values-staging.yaml \
    --namespace default \
    --wait
```

#### Production Deployment
```bash
# Deploy to production
helm upgrade --install alpaca-main charts/alpaca-main \
    --values charts/alpaca-main/values-production.yaml \
    --namespace default \
    --set secrets.data.POSTGRES_PASSWORD="your-secure-password" \
    --set secrets.data.DJANGO_SECRET_KEY="your-django-secret" \
    --set secrets.data.ALPACA_API_KEY="your-alpaca-api-key" \
    --set secrets.data.ALPACA_SECRET_KEY="your-alpaca-secret" \
    --wait
```

## Configuration

### Environment-Specific Values

The Helm chart includes three values files:

1. **`values.yaml`**: Default values with GKE-optimized settings
2. **`values-staging.yaml`**: Staging environment overrides
3. **`values-production.yaml`**: Production environment overrides

### Key Configuration Options

#### Image Repositories
```yaml
backend:
  image:
    repository: naveedkhan1998/alpaca-backend
    tag: "latest"

frontend:
  image:
    repository: naveedkhan1998/alpaca-frontend
    tag: "latest"

nginx:
  image:
    repository: naveedkhan1998/alpaca-nginx
    tag: "latest"
```

#### Ingress Configuration
```yaml
ingress:
  enabled: true
  className: "gce"
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: "alpaca-main-ip"
    networking.gke.io/managed-certificates: "alpaca-main-ssl-cert"
  hosts:
    - host: alpaca.mnaveedk.com
      paths:
        - path: /
          pathType: Prefix
          service: nginx
          port: 80
```

#### Database Persistence
```yaml
postgres:
  persistence:
    enabled: true
    storageClass: "standard-rwo"
    size: 50Gi
```

#### Auto Scaling
```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

## Services Deployed

The Helm chart deploys the following services:

- **Backend**: Django API server
- **Frontend**: React/Next.js application
- **Nginx**: Reverse proxy and load balancer
- **PostgreSQL**: Database with persistent storage
- **Redis**: Cache and message broker
- **Celery Worker**: Background task processor
- **Celery Beat**: Task scheduler
- **Flower**: Celery monitoring UI
- **WebSocket**: Real-time data streaming service

## Monitoring and Management

### Check Deployment Status
```bash
# Check all pods
kubectl get pods -l app.kubernetes.io/instance=alpaca-main

# Check services
kubectl get services -l app.kubernetes.io/instance=alpaca-main

# Check ingress
kubectl get ingress alpaca-main-ingress

# View logs
kubectl logs -l app.kubernetes.io/component=backend
```

### Scale Services
```bash
# Scale backend pods
kubectl scale deployment alpaca-main-backend --replicas=3

# Scale celery workers
kubectl scale deployment alpaca-main-celery-worker --replicas=5
```

### Update Deployment
```bash
# Update with new image
helm upgrade alpaca-main charts/alpaca-main \
    --set backend.image.tag=sha-abc123 \
    --reuse-values
```

## Troubleshooting

### Common Issues

1. **Pod CrashLoopBackOff**: Check logs with `kubectl logs <pod-name>`
2. **ImagePullBackOff**: Verify image names and registry access
3. **Service Unavailable**: Check service endpoints and pod readiness
4. **Database Connection**: Verify PostgreSQL pod is running and accessible

### Debug Commands
```bash
# Describe pod for events
kubectl describe pod <pod-name>

# Check persistent volumes
kubectl get pv,pvc

# View Helm release status
helm status alpaca-main

# View Helm release history
helm history alpaca-main
```

### Rollback
```bash
# Rollback to previous version
helm rollback alpaca-main

# Rollback to specific revision
helm rollback alpaca-main 2
```

## Security Considerations

1. **Secrets**: Use Kubernetes secrets for sensitive data
2. **Network Policies**: Implement network policies for pod-to-pod communication
3. **RBAC**: Configure Role-Based Access Control
4. **Image Security**: Scan images for vulnerabilities
5. **SSL/TLS**: Use managed certificates for HTTPS

## Cost Optimization

1. **Node Auto-scaling**: Enable cluster autoscaling
2. **Pod Resources**: Set appropriate CPU/memory requests and limits
3. **Preemptible Nodes**: Use for non-critical workloads
4. **Storage Classes**: Choose appropriate storage classes
5. **Monitoring**: Use Google Cloud Monitoring for cost tracking

## Backup and Recovery

### Database Backup
```bash
# Create backup
kubectl exec -it <postgres-pod-name> -- pg_dump -U alpaca_user alpaca_db > backup.sql

# Restore backup
kubectl exec -i <postgres-pod-name> -- psql -U alpaca_user alpaca_db < backup.sql
```

### Persistent Volume Backup
```bash
# Create volume snapshot (GKE)
gcloud compute disks snapshot <disk-name> \
    --snapshot-names=alpaca-db-backup-$(date +%Y%m%d) \
    --zone=us-central1-a
```