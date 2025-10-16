$cert = Get-ChildItem -Path cert:\CurrentUser\My | Where-Object {$_.Subject -eq 'CN=localhost' -and $_.FriendlyName -eq 'Laravel Local HTTPS'} | Select-Object -First 1
$certPath = "storage\certs\localhost.pfx"
$certPassword = ConvertTo-SecureString -String "laravel" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $certPath -Password $certPassword
Write-Host "Certificate exported to: $certPath"
Write-Host "Certificate password: laravel"
