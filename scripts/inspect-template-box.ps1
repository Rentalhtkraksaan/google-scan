Add-Type -AssemblyName System.Drawing
$filePath = "d:\laragon\www\google review new\public\images\template-id-card-portrait.jpg"
$bmp = New-Object System.Drawing.Bitmap($filePath)
$w = $bmp.Width
$h = $bmp.Height
Write-Host "Image Size: $w x $h"

# Scan the inner white box region (roughly from 44% to 80% height, 15% to 85% width)
# Let's find the inner flat white area where the QR code belongs
# The metallic border is around the box. Inside the metallic border is a pure white square.
# Let's find the inner white square bounds.
$innerLeft = 0
$innerRight = 0
$innerTop = 0
$innerBottom = 0

# Sample horizontal line through middle (y = 63% of height)
$midY = [int]($h * 0.635)
Write-Host "Sampling at midY = $midY"

$bmp.Dispose()
