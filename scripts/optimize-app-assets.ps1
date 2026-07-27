$ErrorActionPreference = 'Stop'

$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$assetsRoot = Join-Path $workspaceRoot 'src\assets'
$signupTemplate = Join-Path $workspaceRoot 'src\app\home\signup\signup.component.html'

Add-Type -AssemblyName System.Drawing

function Resize-Png {
    param(
        [Parameter(Mandatory = $true)][string]$RelativePath,
        [Parameter(Mandatory = $true)][int]$MaxWidth,
        [Parameter(Mandatory = $true)][int]$MaxHeight
    )

    $sourcePath = Join-Path $workspaceRoot $RelativePath
    if (-not (Test-Path -LiteralPath $sourcePath)) {
        return
    }

    $source = [System.Drawing.Image]::FromFile($sourcePath)
    try {
        $scale = [Math]::Min(
            [Math]::Min($MaxWidth / $source.Width, $MaxHeight / $source.Height),
            1
        )
        $targetWidth = [Math]::Max(1, [int][Math]::Round($source.Width * $scale))
        $targetHeight = [Math]::Max(1, [int][Math]::Round($source.Height * $scale))

        if ($targetWidth -eq $source.Width -and $targetHeight -eq $source.Height) {
            return
        }

        $target = New-Object System.Drawing.Bitmap(
            $targetWidth,
            $targetHeight,
            [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
        )
        try {
            $target.SetResolution(96, 96)
            $graphics = [System.Drawing.Graphics]::FromImage($target)
            try {
                $graphics.Clear([System.Drawing.Color]::Transparent)
                $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
                $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $graphics.DrawImage($source, 0, 0, $targetWidth, $targetHeight)
            }
            finally {
                $graphics.Dispose()
            }

            $temporaryPath = "$sourcePath.optimized.png"
            $target.Save($temporaryPath, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
            $target.Dispose()
        }
    }
    finally {
        $source.Dispose()
    }

    Move-Item -LiteralPath $temporaryPath -Destination $sourcePath -Force
}

function Export-Signup-Superpower-Icons {
    $template = [System.IO.File]::ReadAllText($signupTemplate)
    if ($template -notmatch 'data:image/png;base64') {
        return
    }

    $pattern = '(?s)<svg[^>]*width="32"[^>]*>.*?<image[^>]*xlink:href="data:image/png;base64,([^"]+)"[^>]*/>.*?</svg>'
    $matches = [regex]::Matches($template, $pattern)
    $names = @('build', 'crush', 'own', 'unlock')
    if ($matches.Count -ne $names.Count) {
        throw "Expected four embedded signup icons, found $($matches.Count)."
    }

    $builder = New-Object System.Text.StringBuilder
    $cursor = 0
    for ($index = 0; $index -lt $matches.Count; $index++) {
        $match = $matches[$index]
        [void]$builder.Append($template.Substring($cursor, $match.Index - $cursor))

        $assetName = "superpower-$($names[$index]).png"
        $assetPath = Join-Path $assetsRoot "icons\$assetName"
        [System.IO.File]::WriteAllBytes(
            $assetPath,
            [Convert]::FromBase64String($match.Groups[1].Value)
        )
        [void]$builder.Append("<img src=`"assets/icons/$assetName`" alt=`"`" aria-hidden=`"true`" />")
        $cursor = $match.Index + $match.Length
    }

    [void]$builder.Append($template.Substring($cursor))
    [System.IO.File]::WriteAllText(
        $signupTemplate,
        $builder.ToString(),
        (New-Object System.Text.UTF8Encoding($false))
    )
}

function Export-Analytics-Icons {
    $iconNames = @(
        'arrow-up',
        'bars',
        'task-arrow-up',
        'task-bars',
        'lightning',
        'puzzle',
        'book',
        'cap',
        'journal',
        'mood-sun',
        'star',
        'trophy',
        'flame',
        'coin'
    )

    foreach ($name in $iconNames) {
        $svgPath = Join-Path $assetsRoot "icons\insights-$name.svg"
        if (-not (Test-Path -LiteralPath $svgPath)) {
            continue
        }

        $svg = [System.IO.File]::ReadAllText($svgPath)
        $match = [regex]::Match($svg, 'data:image/png;base64,([^"]+)')
        if (-not $match.Success) {
            throw "The analytics icon is not an embedded PNG: $svgPath"
        }

        $pngPath = Join-Path $assetsRoot "icons\insights-$name.png"
        [System.IO.File]::WriteAllBytes(
            $pngPath,
            [Convert]::FromBase64String($match.Groups[1].Value)
        )
    }
}

Export-Signup-Superpower-Icons
Export-Analytics-Icons

$resizeTargets = @(
    @{ Path = 'src\assets\icons\superpower-build.png'; Width = 96; Height = 96 },
    @{ Path = 'src\assets\icons\superpower-crush.png'; Width = 96; Height = 96 },
    @{ Path = 'src\assets\icons\superpower-own.png'; Width = 96; Height = 96 },
    @{ Path = 'src\assets\icons\superpower-unlock.png'; Width = 96; Height = 96 },
    @{ Path = 'src\assets\Images-Pet\selection-cards\Panda-selection-card.png'; Width = 610; Height = 960 },
    @{ Path = 'src\assets\Images-Pet\selection-cards\Owl-selection-card.png'; Width = 610; Height = 960 },
    @{ Path = 'src\assets\Images-Pet\selection-cards\Llama-selection-card.png'; Width = 610; Height = 960 },
    @{ Path = 'src\assets\Images-Pet\selection-cards\Dragon-selection-card.png'; Width = 610; Height = 960 },
    @{ Path = 'src\assets\Images-Transparent\choose-role-self-figma.png'; Width = 660; Height = 600 },
    @{ Path = 'src\assets\Images-Transparent\choose-role-child-figma.png'; Width = 660; Height = 600 },
    @{ Path = 'src\assets\Images-Transparent\choose-role-parent-figma.png'; Width = 660; Height = 600 },
    @{ Path = 'src\assets\Images-Transparent\details-header-child-figma.png'; Width = 660; Height = 600 },
    @{ Path = 'src\assets\Images-Transparent\details-header-parent-figma.png'; Width = 688; Height = 384 },
    @{ Path = 'src\assets\Images-Transparent\family-code-header-figma.png'; Width = 688; Height = 384 },
    @{ Path = 'src\assets\Images-Transparent\join-family-parent-step-2-figma.png'; Width = 512; Height = 512 },
    @{ Path = 'src\assets\Images-Transparent\create-family-step-1-figma.png'; Width = 512; Height = 512 },
    @{ Path = 'src\assets\Images-Transparent\create-family-step-2-figma.png'; Width = 512; Height = 512 },
    @{ Path = 'src\assets\Images-Transparent\create-family-step-3-figma.png'; Width = 512; Height = 512 },
    @{ Path = 'src\assets\Images-Transparent\create-family-step-4-figma.png'; Width = 512; Height = 512 },
    @{ Path = 'src\assets\Images-Transparent\family-code-step-1-figma.png'; Width = 512; Height = 512 },
    @{ Path = 'src\assets\Images-Transparent\family-code-step-2-figma.png'; Width = 512; Height = 512 },
    @{ Path = 'src\assets\Images-Transparent\family-code-step-3-figma.png'; Width = 512; Height = 512 },
    @{ Path = 'src\assets\Images-Transparent\family-code-step-4-figma.png'; Width = 512; Height = 512 },
    @{ Path = 'src\assets\Images-Transparent\family-code-step-5-figma.png'; Width = 512; Height = 512 },
    @{ Path = 'src\assets\Images-Transparent\details-gender-male-figma.png'; Width = 320; Height = 320 },
    @{ Path = 'src\assets\Images-Transparent\details-gender-female-figma.png'; Width = 320; Height = 320 }
)

1..6 | ForEach-Object {
    $resizeTargets += @{
        Path = "src\assets\Images-Transparent\details-avatar-$_-figma.png"
        Width = 320
        Height = 320
    }
}

@(
    'arrow-up',
    'bars',
    'task-arrow-up',
    'task-bars',
    'lightning',
    'puzzle',
    'book',
    'cap',
    'journal',
    'mood-sun',
    'star',
    'trophy',
    'flame',
    'coin'
) | ForEach-Object {
    $resizeTargets += @{
        Path = "src\assets\icons\insights-$_.png"
        Width = 192
        Height = 192
    }
}

foreach ($target in $resizeTargets) {
    Resize-Png -RelativePath $target.Path -MaxWidth $target.Width -MaxHeight $target.Height
}

