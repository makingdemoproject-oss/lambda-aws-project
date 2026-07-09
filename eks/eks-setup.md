# EKS Setup — my-demo-eks (ap-south-1)

> Run these commands in **AWS CloudShell** or local AWS CLI

---

## Current Config (saved context)

| Item | Value |
|---|---|
| Cluster name | `my-demo-eks` |
| Region | `ap-south-1` (Mumbai) |
| K8s version | `1.31` |
| Node group | `demo-nodes` |
| Instance type | `t3.small` |
| EKS Node EC2 | `13.232.63.191` |
| EKS Node Instance | `i-086c6a42f3914c3cd` |
| EKS Node SG | `sg-02d21cdbe47ff9f24` |
| orders NodePort | `30748` |
| products NodePort | `31692` |
| Cluster IAM Role | `arn:aws:iam::527055790362:role/eks-cluster-role` |
| Node IAM Role | `arn:aws:iam::527055790362:role/eks-node-role` |
| VPC | `vpc-065599aca72278f93` |
| Subnets | `subnet-0e4f8a39a1e33b77e`, `subnet-08f4b25fe38bdf09a`, `subnet-0b8d18d376a07ea45` |
| ALB | `host-routing-alb-910889267.ap-south-1.elb.amazonaws.com` |
| ECR orders | `527055790362.dkr.ecr.ap-south-1.amazonaws.com/orders-api:v1` |
| ECR products | `527055790362.dkr.ecr.ap-south-1.amazonaws.com/products-api:v1` |
| Cost | `$0.10/hr (control plane) + $0.02/hr (t3.small node)` |

---

## CREATE — Full EKS Setup

### Step 1 — IAM Roles (sirf pehli baar)

```bash
# Cluster role
aws iam create-role --role-name eks-cluster-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"eks.amazonaws.com"},"Action":"sts:AssumeRole"}]}' \
  --query 'Role.Arn' --output text

aws iam attach-role-policy --role-name eks-cluster-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSClusterPolicy

# Node role
aws iam create-role --role-name eks-node-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}' \
  --query 'Role.Arn' --output text

aws iam attach-role-policy --role-name eks-node-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
aws iam attach-role-policy --role-name eks-node-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
aws iam attach-role-policy --role-name eks-node-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
```

### Step 2 — EKS Cluster Create (~10-15 min)

```bash
aws eks create-cluster \
  --name my-demo-eks \
  --role-arn arn:aws:iam::527055790362:role/eks-cluster-role \
  --resources-vpc-config subnetIds=subnet-0e4f8a39a1e33b77e,subnet-08f4b25fe38bdf09a,subnet-0b8d18d376a07ea45 \
  --kubernetes-version 1.31 \
  --region ap-south-1 \
  --query 'cluster.{Name:name,Status:status}' --output table

# Status check karo (ACTIVE hone tak wait karo)
aws eks describe-cluster --name my-demo-eks --region ap-south-1 \
  --query 'cluster.status' --output text
```

### Step 3 — Auth Mode Update + Root Access

```bash
# Auth mode update
aws eks update-cluster-config \
  --name my-demo-eks \
  --access-config authenticationMode=API_AND_CONFIG_MAP \
  --region ap-south-1

# 30 sec wait
sleep 30

# Root account ko access do
aws eks create-access-entry \
  --cluster-name my-demo-eks \
  --principal-arn arn:aws:iam::527055790362:root \
  --type STANDARD --region ap-south-1

aws eks associate-access-policy \
  --cluster-name my-demo-eks \
  --principal-arn arn:aws:iam::527055790362:root \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy \
  --access-scope type=cluster --region ap-south-1
```

### Step 4 — Node Group Create (~5 min)

```bash
aws eks create-nodegroup \
  --cluster-name my-demo-eks \
  --nodegroup-name demo-nodes \
  --node-role arn:aws:iam::527055790362:role/eks-node-role \
  --subnets subnet-0e4f8a39a1e33b77e subnet-08f4b25fe38bdf09a \
  --instance-types t3.small \
  --scaling-config minSize=1,maxSize=2,desiredSize=1 \
  --region ap-south-1 \
  --query 'nodegroup.{Name:nodegroupName,Status:status}' --output table

# Status check
aws eks describe-nodegroup --cluster-name my-demo-eks \
  --nodegroup-name demo-nodes --region ap-south-1 \
  --query 'nodegroup.status' --output text
```

### Step 5 — kubectl Configure (CloudShell mein)

```bash
aws eks update-kubeconfig --name my-demo-eks --region ap-south-1
kubectl get nodes
kubectl get pods -A
```

### Step 6 — ECR se Pods Deploy (CloudShell mein)

```bash
# Orders API
kubectl create deployment orders-api \
  --image=527055790362.dkr.ecr.ap-south-1.amazonaws.com/orders-api:v1
kubectl expose deployment orders-api \
  --port=3000 --target-port=3000 --type=NodePort

# Products API
kubectl create deployment products-api \
  --image=527055790362.dkr.ecr.ap-south-1.amazonaws.com/products-api:v1
kubectl expose deployment products-api \
  --port=4000 --target-port=4000 --type=NodePort

# Verify
kubectl get pods
kubectl get services
```

### Step 7 — ALB Target Groups + Rules (local CLI se)

```bash
# NodePorts jo kubectl get services se milenge:
# orders-api → 3000:XXXXX/TCP  (XXXXX note karo)
# products-api → 4000:YYYYY/TCP (YYYYY note karo)

# EKS Node ka Instance ID aur IP:
aws ec2 describe-instances \
  --filters "Name=tag:eks:cluster-name,Values=my-demo-eks" \
  --region ap-south-1 \
  --query 'Reservations[*].Instances[*].{ID:InstanceId,IP:PublicIpAddress,SG:SecurityGroups[0].GroupId}' \
  --output table

# Security group pe NodePort open karo (SG ID upar se lelo)
aws ec2 authorize-security-group-ingress \
  --group-id <EKS_NODE_SG_ID> \
  --protocol tcp --port 30000-32767 \
  --cidr 0.0.0.0/0 --region ap-south-1

# Orders target group (PORT = orders NodePort)
aws elbv2 create-target-group \
  --name eks-orders-tg \
  --protocol HTTP --port <ORDERS_NODEPORT> \
  --vpc-id vpc-065599aca72278f93 \
  --target-type instance \
  --health-check-path "/" \
  --region ap-south-1 \
  --query 'TargetGroups[0].TargetGroupArn' --output text

# Products target group
aws elbv2 create-target-group \
  --name eks-products-tg \
  --protocol HTTP --port <PRODUCTS_NODEPORT> \
  --vpc-id vpc-065599aca72278f93 \
  --target-type instance \
  --health-check-path "/" \
  --region ap-south-1 \
  --query 'TargetGroups[0].TargetGroupArn' --output text

# Register EKS node in both TGs
aws elbv2 register-targets \
  --target-group-arn <ORDERS_TG_ARN> \
  --targets Id=<EKS_INSTANCE_ID>,Port=<ORDERS_NODEPORT> \
  --region ap-south-1

aws elbv2 register-targets \
  --target-group-arn <PRODUCTS_TG_ARN> \
  --targets Id=<EKS_INSTANCE_ID>,Port=<PRODUCTS_NODEPORT> \
  --region ap-south-1
```

---

## PAUSE — Nodes 0 karo (sirf EC2 cost bachao, $0.10/hr control plane chalega)

```bash
aws eks update-nodegroup-config \
  --cluster-name my-demo-eks \
  --nodegroup-name demo-nodes \
  --scaling-config minSize=0,maxSize=2,desiredSize=0 \
  --region ap-south-1
```

## RESUME — Nodes wapas chalao

```bash
aws eks update-nodegroup-config \
  --cluster-name my-demo-eks \
  --nodegroup-name demo-nodes \
  --scaling-config minSize=1,maxSize=2,desiredSize=1 \
  --region ap-south-1
```

---

## DELETE — Pura cluster band karo (free)

```bash
# Step 1 — Node group delete karo (5 min lagenge)
aws eks delete-nodegroup \
  --cluster-name my-demo-eks \
  --nodegroup-name demo-nodes \
  --region ap-south-1

# Status check (DELETED hone tak wait karo)
aws eks describe-nodegroup --cluster-name my-demo-eks \
  --nodegroup-name demo-nodes --region ap-south-1 \
  --query 'nodegroup.status' --output text

# Step 2 — Cluster delete karo (node DELETED hone ke baad)
aws eks delete-cluster \
  --name my-demo-eks \
  --region ap-south-1

# ALB target groups bhi cleanup karo
aws elbv2 delete-target-group \
  --target-group-arn arn:aws:elasticloadbalancing:ap-south-1:527055790362:targetgroup/eks-orders-tg/02e229af134af256 \
  --region ap-south-1

aws elbv2 delete-target-group \
  --target-group-arn arn:aws:elasticloadbalancing:ap-south-1:527055790362:targetgroup/eks-products-tg/8234572321ed8ab3 \
  --region ap-south-1
```

---

## QUICK STATUS CHECK

```bash
# Cluster status
aws eks describe-cluster --name my-demo-eks --region ap-south-1 \
  --query 'cluster.{Status:status,Version:version}' --output table

# Node group status
aws eks describe-nodegroup --cluster-name my-demo-eks \
  --nodegroup-name demo-nodes --region ap-south-1 \
  --query 'nodegroup.{Status:status,Desired:scalingConfig.desiredSize,Running:scalingConfig.minSize}' \
  --output table

# ALB test
curl http://host-routing-alb-910889267.ap-south-1.elb.amazonaws.com/orders
curl http://host-routing-alb-910889267.ap-south-1.elb.amazonaws.com/products
```

---

## COST SUMMARY

| State | Cost/hour |
|---|---|
| Cluster ACTIVE + 1 t3.small node | **$0.12/hr** |
| Cluster ACTIVE + 0 nodes (paused) | **$0.10/hr** |
| Cluster DELETED | **$0.00/hr** |

> **Tip:** Jab use nahi kar rahe — delete karo. Dobara banana sirf 15 min ka kaam hai (IAM roles reuse hoti hain).
