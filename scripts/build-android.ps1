# 构建小米平板 / 安卓可用的 APK（需已安装 JDK 17+，或 Android Studio 自带 JBR）
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $env:JAVA_HOME) {
  $candidates = @(
    "$env:ProgramFiles\Android\Android Studio\jbr",
    "$env:LOCALAPPDATA\Programs\Android\Android Studio\jbr",
    "$env:ProgramFiles\Java\jdk-17",
    "$env:ProgramFiles\Eclipse Adoptium\jdk-17*"
  )
  foreach ($c in $candidates) {
    $resolved = (Resolve-Path $c -ErrorAction SilentlyContinue | Select-Object -First 1)?.Path
    if ($resolved -and (Test-Path "$resolved\bin\java.exe")) {
      $env:JAVA_HOME = $resolved
      break
    }
  }
}

if (-not $env:JAVA_HOME) {
  Write-Host "未找到 Java。请安装 Android Studio 或 JDK 17，并设置 JAVA_HOME 后重试。" -ForegroundColor Red
  Write-Host "也可：用 Android Studio 打开 android 文件夹 → Build → Build APK(s)"
  exit 1
}

Write-Host "JAVA_HOME=$env:JAVA_HOME"
npm run build
npx cap sync android
Set-Location android
.\gradlew.bat assembleDebug
Set-Location $root

$apk = Get-ChildItem -Path "android\app\build\outputs\apk\debug" -Filter "*.apk" | Select-Object -First 1
if ($apk) {
  New-Item -ItemType Directory -Force -Path release | Out-Null
  $dest = Join-Path release "公众号智能助手-1.0.0-android.apk"
  Copy-Item $apk.FullName $dest -Force
  Write-Host "已生成: $dest" -ForegroundColor Green
} else {
  Write-Host "未找到 APK，请检查 Gradle 输出。" -ForegroundColor Yellow
}
