# Kubernetes Deploy (GKE) - Guia paso a paso (entorno dev)

Esta guia describe el flujo completo para desplegar todos los componentes de Deliver Eats en GKE usando el overlay de desarrollo.

## Componentes que se despliegan

- frontend
- api-gateway
- auth-service
- user-service
- catalog-service
- restaurant-service
- order-service
- notification-service
- convert-service
- payment-service
- redis
- rabbitmq

## 0) Prerrequisitos

Antes de iniciar, valida que tienes:

- Proyecto GCP activo.
- Cluster GKE creado y accesible.
- `gcloud`, `kubectl` y `docker` instalados.
- Git Bash disponible (Windows) o shell bash compatible.
- Permisos para Artifact Registry y GKE.
- Repositorio de Artifact Registry creado (por ejemplo `deliver-eats-repo`).

Comandos de verificacion rapida:

```bash
gcloud auth list
gcloud config get-value project
kubectl version --client
kubectl get nodes
```

## 1) Configurar proyecto y cluster

Si vas a cambiar de cuenta de Google Cloud, primero autenticate con la nueva cuenta y deja esa cuenta activa en gcloud:

```bash
gcloud auth login
gcloud auth list
gcloud config set account artoriasdelabismo07@gmail.com
gcloud config get-value project
gcloud projects list
```

Define tu proyecto real, el que contiene el clúster, y configura credenciales del cluster:

```bash
gcloud config set project project-26fc9494-b364-4414-ba9
gcloud config set compute/zone us-central1-a
gcloud container clusters get-credentials deliver-eats-dev --zone us-central1-a
```

Confirma que `kubectl` apunta al cluster correcto:

```bash
kubectl config current-context
kubectl get nodes
```

## 2) Configurar secretos obligatorios

Edita [02-secrets.yaml](02-secrets.yaml) y reemplaza todos los valores `REPLACE_*`.

```bash
export PROJECT_ID="project-26fc9494-b364-4414-ba9"
export REGION="us-central1"
export REGISTRY="$REGION-docker.pkg.dev"

kubectl get ns deliver-eats >/dev/null 2>&1 || kubectl create namespace deliver-eats

gcloud artifacts repositories describe deliver-eats-repo \
  --location=us-central1 >/dev/null 2>&1 || \
gcloud artifacts repositories create deliver-eats-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Deliver Eats Docker images"

gcloud auth configure-docker us-central1-docker.pkg.dev

kubectl create secret docker-registry artifact-registry-pull-secret \
  --namespace deliver-eats \
  --docker-server=us-central1-docker.pkg.dev \
  --docker-username=_json_key \
  --docker-password="$(cat /c/Users/diego/Downloads/service-account.json)" \
  --docker-email=not-used@example.com \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl get secret artifact-registry-pull-secret -n deliver-eats
```

 
## 3) Revisar parametros dev de imagen

Verifica que el overlay dev usa tu proyecto, region, repositorio y tag `dev`:

- [overlays/dev/kustomization.yaml](overlays/dev/kustomization.yaml)

Formato esperado:

`us-central1-docker.pkg.dev/<PROJECT_ID>/<REPOSITORY>/<SERVICE>:dev`

## 4) Construir y publicar todas las imagenes (tag dev)

Desde la raiz del repositorio, ejecuta en Git Bash:

```bash
PROJECT_ID="project-26fc9494-b364-4414-ba9" \
REGION="us-central1" \
REPOSITORY="deliver-eats-repo" \
TAG="dev" \
./k8s/scripts/build-and-push.sh
```

Si quieres fijar la cuenta activa desde el script, agrega `GCP_ACCOUNT`:

```bash
GCP_ACCOUNT="TU_NUEVA_CUENTA@gmail.com" \
PROJECT_ID="project-26fc9494-b364-4414-ba9" \
REGION="us-central1" \
REPOSITORY="deliver-eats-repo" \
TAG="dev" \
./k8s/scripts/build-and-push.sh
```

Confirma que las imagenes quedaron en el registry:

```bash
gcloud artifacts docker images list us-central1-docker.pkg.dev/project-26fc9494-b364-4414-ba9/deliver-eats-repo
```

## 5) Ajustar dominio dev (si usaras Ingress con host)

Si usaras dominio en dev, actualiza los archivos:

- [overlays/dev/managed-certificate.yaml](overlays/dev/managed-certificate.yaml)
- [overlays/dev/ingress-patch.yaml](overlays/dev/ingress-patch.yaml)

Luego apunta DNS (registro A) al IP del Ingress global.

Nota: si aun no tienes dominio para dev, puedes desplegar primero y validar por IP publica.

## 6) Desplegar todo el entorno dev

Aplica el overlay dev completo:

```bash
kubectl apply -k k8s/overlays/dev
```

Esto crea/actualiza namespace, infraestructura, microservicios, frontend e ingress con configuracion dev.

## 7) Validar despliegue por etapas

Estado general:

```bash
kubectl get pods -n deliver-eats
kubectl get svc -n deliver-eats
kubectl get ingress -n deliver-eats
```

Esperar a que todos los pods esten `Running`:

```bash
kubectl get pods -n deliver-eats -w
```

Si algun pod falla, revisar eventos y logs:

```bash
kubectl describe pod <POD_NAME> -n deliver-eats
kubectl logs <POD_NAME> -n deliver-eats --tail=200
```

## 8) Validar certificado administrado (si aplica)

```bash
kubectl get managedcertificate -n deliver-eats
kubectl describe managedcertificate deliver-eats-dev-cert -n deliver-eats
```

El estado pasa a `Active` cuando el DNS del dominio ya resuelve al Ingress.

## 9) Obtener URL y probar endpoints

```bash
kubectl get ingress deliver-eats-ingress -n deliver-eats
```

Cuando `ADDRESS` tenga IP publica:

- `http://<INGRESS_IP>/` -> Frontend
- `http://<INGRESS_IP>/api/health` -> API Gateway

Si configuraste dominio dev y TLS, prueba tambien por `https://<TU_DOMINIO_DEV>/`.

## 10) Re-despliegue rapido en dev

Para subir cambios en desarrollo:

1. Reconstruye y publica imagenes con `TAG=dev`.
2. Reaplica overlay dev:

```bash
kubectl apply -k k8s/overlays/dev
```

3. Reinicia despliegues puntuales si necesitas forzar pull de imagen:

```bash
kubectl rollout restart deployment/<DEPLOYMENT_NAME> -n deliver-eats
kubectl rollout status deployment/<DEPLOYMENT_NAME> -n deliver-eats
```

## 11) CI/CD nativo en GCP (sin GitHub Actions)

Este repositorio incluye un pipeline en GCP:

- [../cloudbuild.yaml](../cloudbuild.yaml): construye y publica imagenes en Artifact Registry y despliega en GKE dev.
- [scripts/create-cloudbuild-trigger.sh](scripts/create-cloudbuild-trigger.sh): crea el trigger automatico por push a `master`.

### 11.1 Permisos requeridos para Cloud Build

Da estos roles al Service Account de Cloud Build del proyecto (`PROJECT_NUMBER@cloudbuild.gserviceaccount.com`):

- `roles/artifactregistry.writer`
- `roles/container.developer` (o `roles/container.admin`)
- `roles/container.clusterViewer`

Si usas RBAC estricto en cluster, tambien autoriza ese SA para aplicar manifests en el namespace `deliver-eats`.

### 11.2 Crear trigger (desde GCP)

Desde la raiz del repo:

```bash
chmod +x ./k8s/scripts/create-cloudbuild-trigger.sh
PROJECT_ID="project-26fc9494-b364-4414-ba9" \
REGION="us-central1" \
REPO_OWNER="DFacundoPerezN" \
REPO_NAME="SA_PROYECTO_202106538" \
./k8s/scripts/create-cloudbuild-trigger.sh
```

> Nota: este flujo usa trigger de Cloud Build administrado en GCP. No usa GitHub Actions ni secretos en GitHub.

### 11.3 Probar pipeline manualmente

```bash
gcloud builds submit --config cloudbuild.yaml .
```

### 11.4 Que hace el pipeline

1. Construye todas las imagenes con Kaniko.
2. Publica en `us-central1-docker.pkg.dev/<PROJECT_ID>/deliver-eats-repo` con tag `dev`.
3. Aplica `k8s/overlays/dev`.
4. Reinicia deployments para forzar pull de la nueva imagen `dev`.
5. Espera rollouts criticos y muestra estado final.
