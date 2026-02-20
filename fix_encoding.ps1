$Path = ".\components\Agenda.tsx"
$Content = [System.IO.File]::ReadAllText($Path)
[System.IO.File]::WriteAllText($Path, $Content, [System.Text.Encoding]::UTF8)
Write-Host "File fixed: $Path"
