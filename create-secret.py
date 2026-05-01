import json
import base64
import sys

# Read the service account JSON
with open('C:/Users/diego/Downloads/service-account.json', 'r') as f:
    sa_json_str = f.read()

# Create the dockercfg entry
dockercfg = {
    'us-central1-docker.pkg.dev': {
        'username': '_json_key',
        'password': sa_json_str,
        'email': 'not-used@example.com',
        'auth': base64.b64encode(('_json_key:' + sa_json_str).encode()).decode()
    }
}

# Encode to base64
dockercfg_json = json.dumps(dockercfg)
dockercfg_b64 = base64.b64encode(dockercfg_json.encode()).decode()

# Create the YAML secret
yaml_content = f"""apiVersion: v1
kind: Secret
metadata:
  name: artifact-registry-pull-secret
  namespace: deliver-eats
type: kubernetes.io/dockercfg
data:
  .dockercfg: {dockercfg_b64}
"""

# Write to file
with open('artifact-registry-secret.yaml', 'w') as f:
    f.write(yaml_content)

print("Secret YAML created: artifact-registry-secret.yaml")
print(f"First 50 chars of base64 password: {dockercfg_b64[:50]}")
