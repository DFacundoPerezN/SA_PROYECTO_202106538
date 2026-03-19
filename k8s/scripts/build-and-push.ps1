param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,
  [string]$Region = "us-central1",
  [string]$Repository = "deliver-eats-repo",
  [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"

$registryHost = "$Region-docker.pkg.dev"
$registryPath = "$registryHost/$ProjectId/$Repository"

$services = @(
  @{ Name = "api-gateway"; Dockerfile = "Delivery-system/gateaway/Dockerfile"; Context = "Delivery-system" },
  @{ Name = "auth-service"; Dockerfile = "Delivery-system/auth-service/Dockerfile"; Context = "Delivery-system" },
  @{ Name = "user-service"; Dockerfile = "Delivery-system/user-service/Dockerfile"; Context = "Delivery-system" },
  @{ Name = "catalog-service"; Dockerfile = "Delivery-system/catalog-service/Dockerfile"; Context = "Delivery-system" },
  @{ Name = "restaurant-service"; Dockerfile = "Delivery-system/restaurant-service/Dockerfile"; Context = "Delivery-system" },
  @{ Name = "order-service"; Dockerfile = "Delivery-system/order-service/Dockerfile"; Context = "Delivery-system" },
  @{ Name = "notification-service"; Dockerfile = "Delivery-system/notification-service/Dockerfile"; Context = "Delivery-system" },
  @{ Name = "convert-service"; Dockerfile = "Delivery-system/convert-service/Dockerfile"; Context = "Delivery-system" },
  @{ Name = "payment-service"; Dockerfile = "Delivery-system/payment-service/Dockerfile"; Context = "Delivery-system" },
  @{ Name = "frontend"; Dockerfile = "Frontend/Dockerfile"; Context = "Frontend" }
)

Write-Host "Configuring Docker auth for $registryHost" -ForegroundColor Cyan
gcloud auth configure-docker $registryHost -q

foreach ($service in $services) {
  $image = "$registryPath/$($service.Name):$Tag"

  Write-Host "====================================================" -ForegroundColor DarkCyan
  Write-Host "Building $($service.Name)" -ForegroundColor Green
  Write-Host "Dockerfile: $($service.Dockerfile)"
  Write-Host "Context: $($service.Context)"
  Write-Host "Image: $image"

  docker build -f $service.Dockerfile -t $image $service.Context
  docker push $image
}

Write-Host "====================================================" -ForegroundColor DarkCyan
Write-Host "Done. Images pushed to $registryPath with tag $Tag" -ForegroundColor Green
