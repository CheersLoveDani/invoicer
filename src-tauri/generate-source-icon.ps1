Add-Type -AssemblyName System.Drawing

$size = 1024
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAliasGridFit'

# Indigo background with rounded corners simulated by clearing and filling
$g.Clear([System.Drawing.Color]::FromArgb(255, 79, 70, 229))

# Draw a white "I" centered
$font = New-Object System.Drawing.Font('Segoe UI', 540, [System.Drawing.FontStyle]::Bold)
$brush = [System.Drawing.Brushes]::White
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = 'Center'
$sf.LineAlignment = 'Center'
$rect = New-Object System.Drawing.RectangleF(0, -40, $size, $size)
$g.DrawString('I', $font, $brush, $rect, $sf)

$bmp.Save("$PSScriptRoot/icon-source.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Host "Saved $PSScriptRoot/icon-source.png"
