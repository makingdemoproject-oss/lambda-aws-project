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

## Orders Service — पूरी YAML (Deployment + Service एक साथ)

```yaml
# ─── orders-deployment.yaml ───────────────────────────────────────────────────

apiVersion: apps/v1          # k8s API version — Deployment के लिए apps/v1
kind: Deployment             # हम Deployment बना रहे हैं
metadata:
  name: express-api          # Deployment का naam
  namespace: default         # default namespace में
  labels:
    app: express-api         # label — Service इसी से pod ढूँढती है
spec:
  replicas: 1                # एक pod चलाओ
  selector:
    matchLabels:
      app: express-api       # इस label वाले pods manage करो
  template:                  # pod का template (pod कैसा बनेगा)
    metadata:
      labels:
        app: express-api     # pod पर यह label लगाओ
    spec:
      containers:
      - name: express-api
        image: 527055790362.dkr.ecr.ap-south-1.amazonaws.com/orders-api:v1
        # ↑ ECR का full image URL — k3s यहाँ से image pull करेगा
        # format: <account>.dkr.ecr.<region>.amazonaws.com/<repo>:<tag>
        ports:
        - containerPort: 3000    # container के अंदर Express port 3000 पर चलता है
        env:
        - name: HOSTNAME         # pod का naam env variable में
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: NODE_IP          # EC2 (node) की IP env variable में
          valueFrom:
            fieldRef:
              fieldPath: status.hostIP
        resources:
          requests:
            memory: "64Mi"       # pod start के लिए minimum 64MB RAM चाहिए
            cpu: "50m"           # 50 milli-CPU = 0.05 core
          limits:
            memory: "128Mi"      # maximum 128MB से ज़्यादा नहीं लेगा
            cpu: "200m"          # maximum 0.2 core

---

# ─── orders-service.yaml ──────────────────────────────────────────────────────

apiVersion: v1               # Service के लिए v1
kind: Service                # Service बना रहे हैं
metadata:
  name: express-service      # Service का naam — DNS में यही नाम बनेगा
  namespace: default
spec:
  type: NodePort             # EC2 के port से बाहर accessible होगा
  selector:
    app: express-api         # ↑ इस label वाले pod को traffic भेजो
    # Deployment और Service का connection यहाँ है —
    # Deployment में labels.app = express-api
    # Service में selector.app = express-api  → MATCH!
  ports:
  - port: 3000               # Service का port (cluster के अंदर)
    targetPort: 3000         # pod के container का port
    nodePort: 30080          # EC2 का port — browser यहाँ hit करता है
    protocol: TCP
```

**Orders pod के अंदर `/combined` route — यहाँ pod-to-pod होता है:**

```javascript
// orders-api ECR image में यह code है
app.get('/combined', async (req, res) => {
  // Orders pod के अंदर से Products pod को call
  const r = await fetch('http://products-service:4000/products')
  //                     ↑
  //         "products-service" = products-service.yaml में metadata.name
  //         k8s DNS इसे ClusterIP में convert करता है
  const data = await r.json()
  res.json({
    orders,                      // orders pod का अपना data
    products: data.products,     // products pod से आया data
    podToPod: {
      ordersPod: process.env.HOSTNAME,   // express-api-xxx
      productsPod: data.servedBy,        // products-api-xxx
    }
  })
})
```

---

## Products Service — पूरी YAML (Deployment + Service एक साथ)

```yaml
# ─── products-deployment.yaml ─────────────────────────────────────────────────

apiVersion: apps/v1
kind: Deployment
metadata:
  name: products-api         # Deployment का naam
  namespace: default
  labels:
    app: products-api        # label
spec:
  replicas: 1
  selector:
    matchLabels:
      app: products-api
  template:
    metadata:
      labels:
        app: products-api    # pod पर यह label
    spec:
      containers:
      - name: products-api
        image: 527055790362.dkr.ecr.ap-south-1.amazonaws.com/products-api:v1
        # ↑ Products की ECR image — अलग repo, अलग image
        ports:
        - containerPort: 4000    # Products Express port 4000 पर चलता है
        env:
        - name: HOSTNAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "200m"

---

# ─── products-service.yaml ────────────────────────────────────────────────────

apiVersion: v1
kind: Service
metadata:
  name: products-service     # ← यह naam बहुत ज़रूरी है!
  # Orders pod इसी naam से call करता है:
  # fetch('http://products-service:4000/products')
  #                  ↑
  #           यह naam यहाँ से आता है
  namespace: default
spec:
  type: NodePort
  selector:
    app: products-api        # इस label वाले pod को traffic भेजो
  ports:
  - port: 4000               # Service port
    targetPort: 4000         # container port
    nodePort: 30081          # EC2 port — browser :30081 से access करे
```

**Products pod के अंदर code:**

```javascript
// products-api ECR image में यह code है
app.get('/products', (req, res) => res.json({
  products: [
    { id: 1, name: 'Laptop', price: 75000, stock: 10 },
    { id: 2, name: 'Phone',  price: 25000, stock: 25 },
    { id: 3, name: 'Tablet', price: 35000, stock: 15 },
  ],
  servedBy: 'Pod: ' + process.env.HOSTNAME  // products-api-xxx
}))
app.listen(4000)
```

---

## दोनों YAML आपस में कैसे जुड़े हैं

```
orders-deployment.yaml          products-service.yaml
──────────────────────          ─────────────────────
server.js में:                  metadata:
  fetch(                          name: products-service  ←┐
    'http://                                                │
     products-service  ──────────────────────────────────┘ │
     :4000/products'   port: 4000 ←────────────────────────┘
  )

orders-service.yaml             products-deployment.yaml
───────────────────             ────────────────────────
selector:                       labels:
  app: express-api  ←────────    app: products-api
                                selector:
metadata:                         matchLabels:
  name: express-service            app: products-api  ←──┐
                                template:                  │
                                  metadata:               │
                                    labels:               │
                                      app: products-api ──┘
```

**Connection का नियम:**
- `Service.selector.app` = `Deployment.template.labels.app` → Service pod को ढूँढती है
- `fetch('http://SERVICE_NAME:PORT')` = `Service.metadata.name` + `Service.ports.port` → pod-to-pod call होता है

---

## Request आने पर पूरा Flow

```
Browser
  ↓  GET http://13.201.138.12:30080/combined

AWS Security Group
  ↓  port 30080 → ALLOW

EC2 Linux Kernel (ip-172-31-41-121)
  ↓  kube-proxy की iptables rule देखी

kube-proxy (NodePort rule):
  :30080 आया → Orders Pod 10.42.0.26:3000  [DNAT]
  ↓

Orders Pod  express-api-7d6dc7b8bc-zm85m
  IP: 10.42.0.26  |  Port: 3000  |  Image: ECR orders-api:v1
  ↓  code चला: fetch('http://products-service:4000/products')

CoreDNS (k8s DNS server)
  ↓  'products-service' → ClusterIP 10.43.x.x

kube-proxy (ClusterIP rule):
  10.43.x.x:4000 → Products Pod 10.42.0.27:4000  [DNAT]
  ↓

Products Pod  products-api-7f47d6bc69-mkwgw
  IP: 10.42.0.27  |  Port: 4000  |  Image: ECR products-api:v1
  ↓  /products चला → data दिया

Orders Pod ← products data मिला
  ↓  orders + products combine किया

Browser ← combined response ✅
```

---

## YAML में क्या लिखा vs k8s ने खुद क्या किया

| काम | किसने किया |
|---|---|
| `products-service` DNS बनाना | k8s ने खुद — Service apply होते ही |
| ClusterIP assign करना | k8s ने खुद |
| iptables DNAT rules | kube-proxy ने खुद |
| DNS resolve करना | CoreDNS ने खुद |
| **हमने लिखा** | `name: products-service`, `nodePort: 30080/30081`, `image: ECR-URL` |

---

## /combined का Response — Proof

```json
{
  "orders": [
    { "id": 1, "item": "Laptop", "qty": 1, "price": 75000 },
    { "id": 2, "item": "Phone",  "qty": 2, "price": 25000 }
  ],
  "products": [
    { "id": 1, "name": "Laptop", "price": 75000, "stock": 10 },
    { "id": 2, "name": "Phone",  "price": 25000, "stock": 25 },
    { "id": 3, "name": "Tablet", "price": 35000, "stock": 15 }
  ],
  "podToPod": {
    "ordersPod":    "express-api-7d6dc7b8bc-zm85m",
    "productsPod":  "Pod: products-api-7f47d6bc69-mkwgw",
    "productsPodCalledVia": "http://products-service:4000/products"
  }
}
```

दोनों pod names अलग = दोनों अलग containers = **pod-to-pod confirmed ✅**

---

## IP Layers

| Layer | IP | किसे दिखती है |
|---|---|---|
| Public IP | `13.201.138.12` | Browser (internet) |
| ClusterIP | `10.43.x.x` | सिर्फ cluster के pods |
| Pod IP | `10.42.0.26`, `10.42.0.27` | सिर्फ cluster (restart पर बदलती है) |
