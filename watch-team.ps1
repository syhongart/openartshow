# watch-team.ps1 - 오픈아트쇼 팀 실시간 대시보드 (변경된 줄만 갱신 + 컨텍스트/토큰 모니터)
# 사용: powershell -ExecutionPolicy Bypass -File .\watch-team.ps1
# 종료: Ctrl+C
# 주: 이 감시기는 별도 PowerShell로 로컬 파일만 읽음 → Claude 토큰 0 소모.

try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
$ErrorActionPreference = 'SilentlyContinue'
$base = 'C:\Users\USER\.claude\projects\d--openartshow'
$CTX_WINDOW = 1000000   # Opus 4.8 [1m] 컨텍스트 창

$roleMap = @{
  'general-purpose'='탐색/분석'; 'performance-analyst'='성능전문가'; 'reference-analyst'='레퍼런스'
  'designer'='디자이너'; 'release-reviewer'='검수관'; 'security-officer'='보안'; 'legal-counsel'='법무'
  'researcher'='리서처'; 'copywriter'='카피'; 'executor'='실행자'; 'team-lead'='팀장'
  'deputy-lead'='부팀장'; 'workflow-subagent'='계약직'
}

function Read-Shared($path) {
  try {
    $fs = [System.IO.File]::Open($path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
    $sr = New-Object System.IO.StreamReader($fs); $t = $sr.ReadToEnd(); $sr.Close(); $fs.Close(); return $t
  } catch { return '' }
}
function Read-Tail($path, $bytes) {   # 큰 파일 꼬리만 읽기(메인 세션 컨텍스트용)
  try {
    $fs = [System.IO.File]::Open($path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
    $start = [Math]::Max(0, $fs.Length - $bytes); $fs.Seek($start, [IO.SeekOrigin]::Begin) | Out-Null
    $sr = New-Object System.IO.StreamReader($fs); $t = $sr.ReadToEnd(); $sr.Close(); $fs.Close(); return $t
  } catch { return '' }
}
function TokK($n) { if ($n -ge 1000) { return ('{0:N1}k' -f ($n / 1000.0)) } else { return "$n" } }
function Short-Model($m) {
  switch -Wildcard ($m) {
    'claude-opus*' { return 'Opus4.8' } 'claude-sonnet*' { return 'Sonnet5' }
    'claude-fable*' { return 'Fable5' } 'claude-haiku*' { return 'Haiku4.5' }
    default { if ($m) { return $m } else { return '-' } }
  }
}
function Stale-Sec($lastTs) {
  if (-not $lastTs) { return 999999 }
  try { return [int]((Get-Date).ToUniversalTime() - [datetimeoffset]::Parse($lastTs).UtcDateTime).TotalSeconds } catch { return 999999 }
}
function Get-AgentInfo($jsonlPath, $agentType) {
  $txt = Read-Shared $jsonlPath
  $o = [pscustomobject]@{ agentType=$agentType; model='-'; effort='-'; task=''; toolUses=0; errors=0; outTok=0; firstTs=$null; lastTs=$null }
  if (-not $txt) { return $o }
  $m = [regex]::Match($txt, '"model"\s*:\s*"([^"]+)"');            if ($m.Success) { $o.model = $m.Groups[1].Value }
  $m = [regex]::Match($txt, '"effort"\s*:\s*"(low|medium|high|xhigh|max)"'); if ($m.Success) { $o.effort = $m.Groups[1].Value }
  $m = [regex]::Match($txt, '\[역할:\s*([^\]]+)\]');               if ($m.Success) { $o.task = $m.Groups[1].Value }
  $o.toolUses = ([regex]::Matches($txt, '"type"\s*:\s*"tool_use"')).Count
  $o.errors   = ([regex]::Matches($txt, '"is_error"\s*:\s*true')).Count
  foreach ($x in [regex]::Matches($txt, '"output_tokens"\s*:\s*(\d+)')) { $o.outTok += [int]$x.Groups[1].Value }
  $ts = [regex]::Matches($txt, '"timestamp"\s*:\s*"([^"]+)"')
  if ($ts.Count -gt 0) { $o.firstTs = $ts[0].Groups[1].Value; $o.lastTs = $ts[$ts.Count - 1].Groups[1].Value }
  return $o
}
function Elapsed-Min($firstTs, $endTs) {
  if (-not $firstTs) { return 0 }
  try {
    $f = [datetimeoffset]::Parse($firstTs).UtcDateTime
    $e = if ($endTs) { [datetimeoffset]::Parse($endTs).UtcDateTime } else { (Get-Date).ToUniversalTime() }
    return [math]::Round(($e - $f).TotalMinutes, 1)
  } catch { return 0 }
}
function Trunc($s, $n) { if ($s -and $s.Length -gt $n) { return $s.Substring(0, $n) + '..' } else { return $s } }
function Health($info, $isDone) {
  if ($isDone) { return @('완료', 'DarkGray') }
  if ($info.errors -ge 3) { return @(('고전(에러' + $info.errors + ')'), 'Red') }
  if ((Stale-Sec $info.lastTs) -gt 150) { return @('정체?', 'Magenta') }
  if ((Elapsed-Min $info.firstTs $null) -gt 10) { return @('장기전', 'Yellow') }
  return @('순조', 'Green')
}
function Seg($t, $c) { return @{ t = "$t"; c = $c } }

$script:prevKeys = @(); $script:top = 0; $script:canCursor = $true
try { Clear-Host; [Console]::CursorVisible = $false; $script:top = [Console]::CursorTop } catch { $script:canCursor = $false }

function Update-Frame($lines) {
  $keys = @(); foreach ($l in $lines) { $keys += (($l | ForEach-Object { $_.t }) -join "`0") }
  if (-not $script:canCursor) {
    try { Clear-Host } catch {}
    foreach ($l in $lines) { foreach ($s in $l) { [Console]::ForegroundColor = [ConsoleColor]$s.c; [Console]::Write($s.t) }; [Console]::ResetColor(); [Console]::WriteLine() }
    $script:prevKeys = $keys; return
  }
  $maxN = [Math]::Max($keys.Count, $script:prevKeys.Count)
  for ($i = 0; $i -lt $maxN; $i++) {
    $nk = if ($i -lt $keys.Count) { $keys[$i] } else { '' }
    $ok = if ($i -lt $script:prevKeys.Count) { $script:prevKeys[$i] } else { '<none>' }
    if ($nk -eq $ok) { continue }
    try { [Console]::SetCursorPosition(0, $script:top + $i) } catch { $script:canCursor = $false; Update-Frame $lines; return }
    if ($i -lt $lines.Count) { foreach ($s in $lines[$i]) { [Console]::ForegroundColor = [ConsoleColor]$s.c; [Console]::Write($s.t) }; [Console]::ResetColor() }
    $pad = [Console]::WindowWidth - [Console]::CursorLeft - 1
    if ($pad -gt 0) { [Console]::Write(' ' * $pad) }
  }
  $script:prevKeys = $keys
  try { [Console]::SetCursorPosition(0, $script:top + $keys.Count) } catch {}
}

while ($true) {
  $wf = Get-ChildItem -Path $base -Recurse -Directory -Filter 'wf_*' |
        Where-Object { Test-Path (Join-Path $_.FullName 'journal.jsonl') } |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1

  # 부팀장(메인 세션) 현재 컨텍스트 크기 - 꼬리만 읽음
  $ctxTok = 0
  $mainFile = Get-ChildItem $base -Filter '*.jsonl' -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($mainFile) {
    $tail = Read-Tail $mainFile.FullName 60000
    $cr = [regex]::Matches($tail, '"cache_read_input_tokens"\s*:\s*(\d+)')
    $cc = [regex]::Matches($tail, '"cache_creation_input_tokens"\s*:\s*(\d+)')
    $ii = [regex]::Matches($tail, '"input_tokens"\s*:\s*(\d+)')
    if ($cr.Count) { $ctxTok += [int]$cr[$cr.Count - 1].Groups[1].Value }
    if ($cc.Count) { $ctxTok += [int]$cc[$cc.Count - 1].Groups[1].Value }
    if ($ii.Count) { $ctxTok += [int]$ii[$ii.Count - 1].Groups[1].Value }
  }
  $pct = [math]::Round($ctxTok * 100.0 / $CTX_WINDOW, 0)
  $ctxCol = if ($pct -ge 80) { 'Red' } elseif ($pct -ge 50) { 'Yellow' } else { 'Green' }

  $lines = @()
  $lines += , @((Seg '===============================================================' 'DarkCyan'))
  $lines += , @((Seg ('  오픈아트쇼 팀 현황        ' + (Get-Date -Format 'HH:mm:ss') + '   (Ctrl+C 종료)') 'Cyan'))
  $lines += , @((Seg '===============================================================' 'DarkCyan'))

  $lines += , @((Seg '' 'Gray'))
  $lines += , @((Seg '  [리더십]' 'White'))
  $lines += , @(
    (Seg '   부팀장   Opus4.8   ' 'DarkGray'),
    (Seg ('컨텍스트 {0}/1M ({1}%)' -f (TokK $ctxTok), $pct) $ctxCol),
    (Seg '  총괄 중' 'DarkGray'))

  if ($wf) {
    $subDir = Split-Path (Split-Path $wf.FullName -Parent) -Parent
    $seenRole = @{}; $shownLead = $false
    foreach ($m in (Get-ChildItem $subDir -Filter 'agent-*.meta.json' | Sort-Object LastWriteTime -Descending)) {
      $aid  = ($m.Name -replace '^agent-', '') -replace '\.meta\.json$', ''
      $type = (Get-Content $m.FullName -Raw | ConvertFrom-Json).agentType
      if ($seenRole.ContainsKey($type)) { continue }
      $info = Get-AgentInfo (Join-Path $subDir ('agent-' + $aid + '.jsonl')) $type
      if ((Stale-Sec $info.lastTs) -gt 1800) { continue }
      $seenRole[$type] = $true
      $isDone = (Stale-Sec $info.lastTs) -gt 45
      $role = if ($roleMap.ContainsKey($type)) { $roleMap[$type] } else { $type }
      $h = Health $info $isDone
      $endTs = $null; if ($isDone) { $endTs = $info.lastTs }
      $el = Elapsed-Min $info.firstTs $endTs
      $lines += , @(
        (Seg ('   {0,-7} {1,-8}/{2,-5} {3,5}분 {4,6}  ' -f $role, (Short-Model $info.model), $info.effort, $el, (TokK $info.outTok)) 'Gray'),
        (Seg $h[0] $h[1]))
      $shownLead = $true
    }
    if (-not $shownLead) { $lines += , @((Seg '   팀장/게이트: 현재 활동 없음(대기)' 'DarkGray')) }
  }

  if (-not $wf) {
    $lines += , @((Seg '' 'Gray'))
    $lines += , @((Seg '  실행 중인 워크플로우 없음. 대기 중...' 'Yellow'))
    Update-Frame $lines; Start-Sleep 3; continue
  }

  # 워크플로우 에이전트 수집(파일 1회 읽기) → 총 생성토큰 합산
  $journal = Join-Path $wf.FullName 'journal.jsonl'
  $started = @{}; $done = @{}
  Get-Content $journal | ForEach-Object {
    if (-not $_) { return }
    $ty = if ($_ -match '"type"\s*:\s*"(started|result)"') { $matches[1] } else { $null }
    $ai = if ($_ -match '"agentId"\s*:\s*"([0-9a-fA-F]+)"')  { $matches[1] } else { $null }
    if ($ty -and $ai) { if ($ty -eq 'started') { $started[$ai] = $true } else { $done[$ai] = $true } }
  }
  $agents = @()
  foreach ($m in (Get-ChildItem $wf.FullName -Filter 'agent-*.meta.json' | Sort-Object CreationTime)) {
    $aid  = ($m.Name -replace '^agent-', '') -replace '\.meta\.json$', ''
    $type = (Get-Content $m.FullName -Raw | ConvertFrom-Json).agentType
    $info = Get-AgentInfo (Join-Path $wf.FullName ('agent-' + $aid + '.jsonl')) $type
    $agents += [pscustomobject]@{ aid = $aid; type = $type; info = $info }
  }
  $wfGen = ($agents | ForEach-Object { $_.info.outTok } | Measure-Object -Sum).Sum
  if (-not $wfGen) { $wfGen = 0 }
  $nDone = $done.Count; $nAll = $started.Count; $nRun = $nAll - $nDone

  $lines += , @((Seg '' 'Gray'))
  $lines += , @(
    (Seg ('  [현재 작업]  완료 {0}/{1}   생성 {2}   ' -f $nDone, $nAll, (TokK $wfGen)) 'White'),
    (Seg ('[' + ('#' * $nDone) + ('-' * [Math]::Max(0, $nRun)) + ']') 'Green'))

  foreach ($a in $agents) {
    $info = $a.info
    $isDone = $done.ContainsKey($a.aid)
    $isRun  = $started.ContainsKey($a.aid) -and -not $isDone
    $st  = if ($isDone) { '[완료] ' } elseif ($isRun) { '[작업중]' } else { '[대기] ' }
    $col = if ($isRun) { 'Yellow' } else { 'DarkGray' }
    $role = if ($roleMap.ContainsKey($a.type)) { $roleMap[$a.type] } else { $a.type }
    $h = Health $info $isDone
    $endTs = $null; if ($isDone) { $endTs = $info.lastTs }
    $el = Elapsed-Min $info.firstTs $endTs
    $taskShow = if ($info.task) { $info.task } else { '(준비중)' }
    $lines += , @(
      (Seg ('   {0} ' -f $st) $col),
      (Seg ('{0,-8} {1,-8}/{2,-5} {3,5}분 t{4,-2} {5,6} ' -f $role, (Short-Model $info.model), $info.effort, $el, $info.toolUses, (TokK $info.outTok)) 'Gray'),
      (Seg ('{0,-8}' -f $h[0]) $h[1]),
      (Seg (' | ' + (Trunc $taskShow 28)) 'DarkGray'))
  }

  if ($nAll -gt 0 -and $nRun -eq 0) {
    $lines += , @((Seg '' 'Gray'))
    $lines += , @((Seg '  >> 모든 계약직 완료 - 워크플로우 종료 또는 다음 단계 준비 중.' 'DarkGreen'))
  }

  Update-Frame $lines
  Start-Sleep 3
}
