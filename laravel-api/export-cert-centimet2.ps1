$cert = Get-ChildItem -Path cert:\CurrentUser\My | Where-Object {$_.Subject -eq 'CN=centimet2.com' -and $_.FriendlyName -eq 'Centimet2 HTTPS'} | Select-Object -First 1
$certPath = "storage\certs\centimet2.pfx"
$certPassword = ConvertTo-SecureString -String "laravel" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $certPath -Password $certPassword
Write-Host "Certificate exported to: $certPath"
Write-Host "Certificate password: laravel"
Write-Host "Certificate DNS names: centimet2.com, *.centimet2.com"
