#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-project-26fc9494-b364-4414-ba9}"
REGION="${REGION:-us-central1}"
TRIGGER_NAME="${TRIGGER_NAME:-deploy-dev-on-master}"
REPO_OWNER="${REPO_OWNER:-DFacundoPerezN}"
REPO_NAME="${REPO_NAME:-SA_PROYECTO_202106538}"
BRANCH_PATTERN="${BRANCH_PATTERN:-^master$}"

cat <<EOF
Creating Cloud Build trigger:
  project: ${PROJECT_ID}
  region:  ${REGION}
  name:    ${TRIGGER_NAME}
  repo:    ${REPO_OWNER}/${REPO_NAME}
  branch:  ${BRANCH_PATTERN}
EOF

gcloud config set project "${PROJECT_ID}" >/dev/null

# Requires GitHub App connection configured in Cloud Build (2nd gen repositories).
gcloud builds triggers create github \
  --name="${TRIGGER_NAME}" \
  --region="${REGION}" \
  --repo-owner="${REPO_OWNER}" \
  --repo-name="${REPO_NAME}" \
  --branch-pattern="${BRANCH_PATTERN}" \
  --build-config="cloudbuild.yaml"

echo "Trigger created successfully."

echo "List triggers:"
gcloud builds triggers list --region="${REGION}"
