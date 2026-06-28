# Pod-to-Pod Communication — k8s में pods आपस में कैसे बात करते हैं

## अभी कौन सा Pod किस Port पर चल रहा है

| Pod Name | Image (ECR) | Container Port | NodePort (EC2) | Public URL |
|---|---|---|---|---|
| `express-api-7d6dc7b8bc-zm85m` | `orders-api:v1` | 3000 | 30080 | http://13.201.138.12:30080 |
| `products-api-7f47d6bc69-mkwgw` | `products-api:v1` | 4000 | 30081 | http://13.201.138.12:30081 |

### Available Routes

**Orders Pod (:30080)**
| Route | काम |
|---|---|
| GET /health | Pod health check |
| GET /orders | सभी orders |
| GET /pod-info | Pod की info |
| POST /orders | नया order बनाओ |
| **GET /combined** | **Orders pod → Products pod call (pod-to-pod)** |

**Products Pod (:30081)**
| Route | काम |
|---|---|
| GET /health | Pod health check |
| GET /products | सभी products |
| GET /products/:id | एक product by ID |
| POST /products | नया product बनाओ |

---

## Pod-to-Pod कैसे काम करता है

### कोई extra YAML नहीं लिखना पड़ा

k8s ने खुद pod-to-pod connection बनाया — हमने बस `products-service.yaml` में Service का naam दिया था।

### एक line का connection

```
orders server.js में:                     products-service.yaml में:
fetch('http://products-service:4000')  →  metadata:
          ↑                                 name: products-service
     यह naam match होना चाहिए ↑
```

---

## Request आने पर पूरा Flow

```
Browser
  ↓  GET http://13.201.138.12:30080/combined

AWS Security Group
  ↓  port 30080 → ALLOW (inbound rule है)

EC2 Linux Kernel (ip-172-31-41-121)
  ↓  kube-proxy की iptables rule देखी

kube-proxy की rule (NodePort):
  :30080 आया → Orders Pod 10.42.0.26:3000 को भेजो  [DNAT]
  ↓

Orders Pod  (express-api-7d6dc7b8bc-zm85m)
Pod IP: 10.42.0.26  |  Port: 3000  |  Image: ECR orders-api:v1
  ↓  यह code चला:
     const r = await fetch('http://products-service:4000/products')

CoreDNS  (k8s का internal DNS server)
  ↓  'products-service' → ClusterIP 10.43.x.x resolve किया
     Full DNS: products-service.default.svc.cluster.local

kube-proxy की दूसरी rule (ClusterIP):
  10.43.x.x:4000 → Products Pod 10.42.0.27:4000  [DNAT]
  ↓

Products Pod  (products-api-7f47d6bc69-mkwgw)
Pod IP: 10.42.0.27  |  Port: 4000  |  Image: ECR products-api:v1
  ↓  /products route चला → products data return किया

Orders Pod को products data मिला
  ↓  orders + products combine किया → browser को भेजा

Browser को combined response मिला ✅
```

---

## /combined का Response — Proof of Pod-to-Pod

```json
{
  "orders": [
    { "id": 1, "item": "Laptop", "qty": 1, "price": 75000, "status": "delivered" },
    { "id": 2, "item": "Phone",  "qty": 2, "price": 25000, "status": "shipped" }
  ],
  "products": [
    { "id": 1, "name": "Laptop", "price": 75000, "stock": 10 },
    { "id": 2, "name": "Phone",  "price": 25000, "stock": 25 },
    { "id": 3, "name": "Tablet", "price": 35000, "stock": 15 }
  ],
  "podToPod": {
    "ordersPod": "express-api-7d6dc7b8bc-zm85m",
    "productsPod": "Pod: products-api-7f47d6bc69-mkwgw",
    "productsPodCalledVia": "http://products-service:4000/products",
    "message": "Orders pod ne products-service ko DNS name se call kiya — pod-to-pod!"
  }
}
```

दोनों pod names अलग हैं = दोनों अलग containers में चल रहे हैं = **pod-to-pod confirmed ✅**

---

## YAML में क्या लिखा vs k8s ने खुद क्या किया

| काम | किसने किया |
|---|---|
| `products-service` DNS entry बनाना | k8s ने खुद — Service apply होते ही |
| ClusterIP (10.43.x.x) assign करना | k8s ने खुद |
| NodePort iptables rule बनाना | kube-proxy ने खुद |
| ClusterIP → Pod IP routing | kube-proxy ने खुद |
| DNS resolve करना | CoreDNS ने खुद |
| **हमने YAML में लिखा** | बस `name: products-service` और `nodePort: 30081` |

---

## IP Layers — तीन अलग IPs

```
Public IP      →  13.201.138.12       (EC2 Elastic IP — internet से accessible)
ClusterIP      →  10.43.x.x           (virtual IP — sirf cluster ke andar)
Pod IP         →  10.42.0.26 / 0.27   (actual container IP — ephemeral)
```

- Browser **Public IP** जानता है
- Orders pod **ClusterIP** से products pod तक पहुँचता है (DNS के ज़रिये)
- **Pod IP** restart होने पर बदल जाती है — इसीलिए हम Service naam use करते हैं, IP नहीं

---

## ECR से Image कैसे आई Pod में

```
Dockerfile (local/EC2)
  ↓  docker build -t products-api:v1 .
Docker Image (EC2 local)
  ↓  docker push 527055790362.dkr.ecr.ap-south-1.amazonaws.com/products-api:v1
ECR Repository
  ↓  kubectl apply -f products-deployment.yaml
k3s → containerd → ECR से image pull किया
  ↓
Products Pod running ✅
```

### ECR YAML में सिर्फ यह लिखना पड़ा:
```yaml
containers:
- name: products-api
  image: 527055790362.dkr.ecr.ap-south-1.amazonaws.com/products-api:v1
  # बस image URL — कोई ConfigMap नहीं, कोई initContainer नहीं
```

---

## Files in this directory

```
k8s-ec2/
├── orders-deployment.yaml       # Orders pod Deployment (ECR image)
├── orders-service.yaml          # Orders NodePort Service (:30080)
├── products-deployment.yaml     # Products pod Deployment (ECR image)
├── products-service.yaml        # Products NodePort Service (:30081)
├── pod-to-pod-communication.md  # यह file
├── cloudformation.yaml          # EC2 + k3s infrastructure
├── radio-booking-ecr-cf.yaml   # ECR repo CloudFormation
└── k8s-manifests/
    ├── express-deployment.yaml  # (पुराना — ConfigMap method)
    ├── products-deployment.yaml # (पुराना — ConfigMap method)
    └── pod-to-pod.yaml          # (gateway+backend example)
```
