$badges = @(
    "[![CI](https://github.com/iniemamocny/MebloPlan/actions/workflows/ci.yml/badge.svg)](https://github.com/iniemamocny/MebloPlan/actions/workflows/ci.yml)",
    "[![Pages](https://github.com/iniemamocny/MebloPlan/actions/workflows/pages.yml/badge.svg)](https://github.com/iniemamocny/MebloPlan/actions/workflows/pages.yml)",
    "[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)"
)
$readme = "README.md"
$content = if (Test-Path $readme) { Get-Content $readme -Raw } else { "" }
$new = ($badges -join " ") + "`r`n`r`n" + $content
Set-Content $readme $new
Write-Host "Badges added to README.md"
