$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function Add-RoundedRect($path, [System.Drawing.RectangleF]$rect, [float]$radius) {
  $d = $radius * 2
  $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
  $path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
  $path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
  $path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
  $path.CloseFigure()
}

function New-IconBitmap([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  $pad = [int]($size * 0.055)
  $rect = New-Object System.Drawing.RectangleF $pad, $pad, ($size - 2 * $pad), ($size - 2 * $pad)
  $radius = [float]($size * 0.23)

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  Add-RoundedRect $path $rect $radius

  $grad = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $rect,
    [System.Drawing.Color]::FromArgb(255, 139, 92, 246),
    [System.Drawing.Color]::FromArgb(255, 34, 211, 238),
    45
  )
  $g.FillPath($grad, $path)

  # Glass highlight across the top half.
  $hiRect = New-Object System.Drawing.RectangleF ($pad + 6), ($pad + 6), ($size - 2 * $pad - 12), (($size - 2 * $pad) * 0.52)
  $hiPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  Add-RoundedRect $hiPath $hiRect ($radius * 0.8)
  $hi = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $hiRect,
    [System.Drawing.Color]::FromArgb(70, 255, 255, 255),
    [System.Drawing.Color]::FromArgb(0, 255, 255, 255),
    90
  )
  $g.FillPath($hi, $hiPath)

  # Inner rim.
  $rimRect = New-Object System.Drawing.RectangleF ($pad + 3), ($pad + 3), ($size - 2 * $pad - 6), ($size - 2 * $pad - 6)
  $rimPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  Add-RoundedRect $rimPath $rimRect ($radius - 2)
  $rimPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(90, 255, 255, 255), 1.4)
  $g.DrawPath($rimPen, $rimPath)

  # Stylized A.
  $fontSize = [int]($size * 0.56)
  $font = [System.Drawing.Font]::new('Segoe UI Semibold', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $textRect = New-Object System.Drawing.RectangleF ($size * 0.11), ($size * 0.14), ($size * 0.72), ($size * 0.72)

  $shadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(80, 20, 10, 60))
  $shadowRect = New-Object System.Drawing.RectangleF ($textRect.X + 2), ($textRect.Y + 3), $textRect.Width, $textRect.Height
  $g.DrawString('A', $font, $shadowBrush, $shadowRect, $sf)
  $g.DrawString('A', $font, [System.Drawing.Brushes]::White, $textRect, $sf)

  # Sparkle integrated into the upper-right of the letter.
  $cx = [float]($size * 0.70)
  $cy = [float]($size * 0.31)
  $outer = [float]($size * 0.085)
  $inner = [float]($size * 0.020)
  $star = @(
    (New-Object System.Drawing.PointF $cx, ($cy - $outer)),
    (New-Object System.Drawing.PointF ($cx + $inner), ($cy - $inner)),
    (New-Object System.Drawing.PointF ($cx + $outer), $cy),
    (New-Object System.Drawing.PointF ($cx + $inner), ($cy + $inner)),
    (New-Object System.Drawing.PointF $cx, ($cy + $outer)),
    (New-Object System.Drawing.PointF ($cx - $inner), ($cy + $inner)),
    (New-Object System.Drawing.PointF ($cx - $outer), $cy),
    (New-Object System.Drawing.PointF ($cx - $inner), ($cy - $inner))
  )
  $g.FillPolygon([System.Drawing.Brushes]::White, $star)

  $g.Dispose()
  $font.Dispose()
  $sf.Dispose()
  $grad.Dispose()
  $hi.Dispose()
  $rimPen.Dispose()
  $shadowBrush.Dispose()
  $path.Dispose()
  $hiPath.Dispose()
  $rimPath.Dispose()
  return $bmp
}

$master = New-IconBitmap 512
$master.Save((Join-Path (Get-Location) 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)

# Build a proper multi-resolution PNG-compressed ICO.
$sizes = @(256, 128, 64, 32, 16)
$pngBytes = @()
foreach ($s in $sizes) {
  $bmp = New-IconBitmap $s
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $pngBytes += ,$ms.ToArray()
  $ms.Dispose()
  $bmp.Dispose()
}
$master.Dispose()

$fs = [System.IO.File]::Create((Join-Path (Get-Location) 'icon.ico'))
$bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]$sizes.Count)
$offset = 6 + (16 * $sizes.Count)
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $s = $sizes[$i]
  $data = $pngBytes[$i]
  $bw.Write([byte]$(if ($s -eq 256) { 0 } else { $s }))
  $bw.Write([byte]$(if ($s -eq 256) { 0 } else { $s }))
  $bw.Write([byte]0)
  $bw.Write([byte]0)
  $bw.Write([UInt16]1)
  $bw.Write([UInt16]32)
  $bw.Write([UInt32]$data.Length)
  $bw.Write([UInt32]$offset)
  $offset += $data.Length
}
foreach ($data in $pngBytes) { $bw.Write($data) }
$bw.Close()
$fs.Close()

Get-Item icon.png, icon.ico | Select-Object Name, Length | Format-Table -AutoSize
