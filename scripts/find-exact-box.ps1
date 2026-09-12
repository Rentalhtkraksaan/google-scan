Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("d:\laragon\www\google review new\public\images\template-id-card-portrait.jpg")
$bmp = New-Object System.Drawing.Bitmap($img)
$w = $bmp.Width
$h = $bmp.Height

Write-Host "Image Dimensions: $w x $h"

# In template-id-card-portrait.jpg:
# Let's inspect rows around y = 45% to 85% to find the inner flat area
# The metallic border has gradient/gray/color.
# Let's find where the pure white or inner cavity starts and ends.
# Let's sample along horizontal line y = [int]($h * 0.635)
$sampleY = [int]($h * 0.635)
Write-Host "Sampling at Y = $sampleY"

# Scan from x = 0 to $w
for ($x = 0; $x -lt $w; $x += 4) {
    $p = $bmp.GetPixel($x, $sampleY)
    if ($x -gt [int]($w * 0.15) -and $x -lt [int]($w * 0.85)) {
        # Check border colors
    }
}

# Find top and bottom of inner area at x = [int]($w * 0.48)
$sampleX = [int]($w * 0.48)

$bmp.Dispose()
$img.Dispose()
