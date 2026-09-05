param(
  [int]$Rate = 1
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRoot = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $projectRoot 'src\data'
$publicRoot = Join-Path $projectRoot 'public'

Add-Type -AssemblyName System.Speech

Get-ChildItem -LiteralPath $dataRoot -Filter '*.json' | Sort-Object Name | ForEach-Object {
  $content = Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json
  if (-not $content.narration -or -not $content.narration.enabled) {
    Write-Host "SKIP $($_.Name) (narration disabled)"
    return
  }

  $cues = [ordered]@{}
  if ($content.PSObject.Properties.Name -contains 'questions') {
    $cues['intro'] = "Welcome to $($content.title). Get ready for $($content.questions.Count) questions."
    foreach ($question in $content.questions) {
      $cues["$($question.id)-question"] = $question.question
      $cues["$($question.id)-answer"] = "The answer is $($question.answer). $($question.explanation)"
    }
    $cues['outro'] = "Amazing work! You completed all $($content.questions.Count) questions. Thanks for playing!"
  }
  else {
    $cues['intro'] = 'Can you guess the animal?'
    $cues['clue-1'] = "Clue one. $($content.clues[0])"
    $cues['clue-2'] = "Clue two. $($content.clues[1])"
    $cues['answer'] = "The answer is $($content.answer)."
    $cues['fact'] = "Fun fact. $($content.funFact)"
    $cues['outro'] = 'Great job! Thanks for playing.'
  }

  $relativeAudioBase = $content.narration.audioBase.Replace('/', [IO.Path]::DirectorySeparatorChar)
  $audioRoot = [IO.Path]::GetFullPath((Join-Path $publicRoot $relativeAudioBase))
  if (-not $audioRoot.StartsWith([IO.Path]::GetFullPath($publicRoot), [StringComparison]::OrdinalIgnoreCase)) {
    throw "Narration audioBase must stay inside public/: $($content.narration.audioBase)"
  }
  New-Item -ItemType Directory -Path $audioRoot -Force | Out-Null

  $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
  try {
    $speaker.SelectVoice($content.narration.voice)
    $speaker.Rate = $Rate
    $speaker.Volume = 100

    foreach ($cue in $cues.GetEnumerator()) {
      $output = Join-Path $audioRoot "$($cue.Key).wav"
      $speaker.SetOutputToWaveFile($output)
      $speaker.Speak([string]$cue.Value)
      $speaker.SetOutputToNull()
      Write-Host "GENERATED $($content.narration.audioBase)/$($cue.Key).wav"
    }
  }
  finally {
    $speaker.Dispose()
  }
}
