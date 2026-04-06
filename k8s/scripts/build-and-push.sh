#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-us-central1}"
REPOSITORY="${REPOSITORY:-deliver-eats-repo}"
TAG="${TAG:-latest}"
GCP_ACCOUNT="${GCP_ACCOUNT:-}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "ERROR: PROJECT_ID is required"
  echo "Usage: PROJECT_ID=<gcp-project-id> REGION=us-central1 REPOSITORY=deliver-eats-repo TAG=latest ./k8s/scripts/build-and-push.sh"
  exit 1
fi

REGISTRY_HOST="${REGION}-docker.pkg.dev"
REGISTRY_PATH="${REGISTRY_HOST}/${PROJECT_ID}/${REPOSITORY}"

if [[ -n "$GCP_ACCOUNT" ]]; then
  echo "Setting active gcloud account to ${GCP_ACCOUNT}"
  gcloud config set account "${GCP_ACCOUNT}" >/dev/null
fi

services=(
  "api-gateway|Delivery-system/gateaway/Dockerfile|Delivery-system"
  "auth-service|Delivery-system/auth-service/Dockerfile|Delivery-system"
  "user-service|Delivery-system/user-service/Dockerfile|Delivery-system"
  "catalog-service|Delivery-system/catalog-service/Dockerfile|Delivery-system"
  "restaurant-service|Delivery-system/restaurant-service/Dockerfile|Delivery-system"
  "order-service|Delivery-system/order-service/Dockerfile|Delivery-system"
  "notification-service|Delivery-system/notification-service/Dockerfile|Delivery-system"
  "convert-service|Delivery-system/convert-service/Dockerfile|Delivery-system"
  "payment-service|Delivery-system/payment-service/Dockerfile|Delivery-system"
  "frontend|Frontend/Dockerfile|Frontend"
)

echo "Configuring Docker auth for ${REGISTRY_HOST}"
gcloud auth configure-docker "${REGISTRY_HOST}" -q

for service in "${services[@]}"; do
  IFS='|' read -r name dockerfile context <<< "${service}"
  image="${REGISTRY_PATH}/${name}:${TAG}"

  echo "===================================================="
  echo "Building ${name}"
  echo "Dockerfile: ${dockerfile}"
  echo "Context: ${context}"
  echo "Image: ${image}"

  docker build -f "${dockerfile}" -t "${image}" "${context}"
  docker push "${image}"
done

echo "===================================================="
echo "Done. Images pushed to ${REGISTRY_PATH} with tag ${TAG}"
