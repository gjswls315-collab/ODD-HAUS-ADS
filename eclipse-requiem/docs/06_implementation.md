# 06. HTML5 구현 설계 · 우선순위 · 화면별 제작 포인트

> 기술 기준(PDF 유지): **Phaser 3 + TypeScript + Vite**, WebAudio, `localStorage`. 데스크톱 Chrome/Edge 60 fps가 1차 목표다.
> 수치는 [00_overview.md](00_overview.md) · [05_stage1.md](05_stage1.md)와 같다. 이 문서는 "어떻게 만들 것인가"만 다룬다.

---

## 1. 프로젝트 구조

```text
eclipse-requiem-game/
  index.html
  vite.config.ts
  src/
    main.ts                     # Phaser.Game 생성, 스케일 정책
    config/
      constants.ts              # 논리 해상도 640x360, UI 1920x1080, 레이어 z
      tokens.ts                 # 컬러/시간/이징 토큰 (00 · 04 문서와 1:1)
    core/
      FixedStep.ts              # 60 Hz 고정 타임스텝
      Rng.ts                    # 시드 RNG (리플레이·텔레메트리)
      EventBus.ts               # Stage -> HUD 이벤트
    scenes/                     # Boot, Intro, Title, Prologue, Select, HowTo, Preview,
                                # Stage, HUD, Pause, GameOver, Clear, Results, Options, Archive
    systems/
      InputManager.ts           # 키 상태 폴링, 리바인딩
      PlayerController.ts       # 이동, 집중, 무적, 히트박스
      WeaponSystem.ts           # 자동 사격, 차지 단계, 폭탄
      ProjectilePool.ts         # 적탄/아군탄 풀
      PatternEngine.ts          # aimed / fan / radial / wave / homing / delayed
      TimelineSpawner.ts        # 스테이지 JSON 재생, TL 정지/재개
      EnemyController.ts        # 경로 + 패턴 스크립트
      BossController.ts         # 페이즈, 전환 시퀀스, 타이머, 분노
      HazardSystem.ts           # 낙뢰, 안개, 파편
      ItemSystem.ts             # 드롭, 흡수, 회수선
      ScoreSystem.ts            # 점수, Chain, Graze, 랭크
      CameraFX.ts               # 흔들림(상한 3px), 히트스톱, 플래시
      AudioManager.ts           # 버스, 덕킹, 레이어 BGM
      SaveManager.ts            # localStorage (버전 관리)
      Telemetry.ts              # 05 문서 §14 이벤트
    ui/                         # MenuList, Button, Panel9, SegmentBar, ChargeGauge, BossBar,
                                # StatBar, Dialog, Caption, KeyHints, Countdown, RankStamp
  data/
    characters.json  items.json  bullets.json  enemies.json  patterns.json
    stages/stage1.timeline.json
    bosses/abaddon.json  bosses/graven.json
  assets/
    atlas/   (sprites@1x.png + json, 2048x2048 이하)
    bg/      ui/   fonts/   audio/ (ogg + m4a)
```

## 2. 씬 · 상태 머신

| PDF 상태 | 씬 | 진입 | 이탈 | 병렬 실행 |
|---|---|---|---|---|
| BOOT | `Boot` → `Intro` | 페이지 로드 | 공통 에셋 + 웹폰트 로드 완료 | — |
| TITLE | `Title` (+ `Prologue`, `Options`, `Archive`) | 인트로 입력 | 메뉴 선택 | — |
| SELECT | `Select` → `HowTo`(첫 실행) → `Preview` | START / CHARACTER SELECT | Begin | — |
| PLAY | `Stage` | Preview Begin / Continue YES | 스테이지 클리어 · 잔기 0 | **`HUD`** 항상 위에서 병렬 |
| PAUSE | `Pause` (Stage·HUD를 `pause()`) | P/Esc · 탭 비활성 | Resume | — |
| RESULTS | `Clear` → `Results` | 보스 격파 D+5.5 | 다음 스테이지 · 타이틀 | — |
| GAMEOVER | `GameOver` 오버레이 | 잔기 0 | YES → PLAY 재개 / NO → RESULTS | Stage 정지 |

- 상태가 바뀔 때마다 **입력 컨텍스트를 갈아 끼운다**(전투 입력과 메뉴 입력이 동시에 살아 있으면 안 됨).
- `Stage` → `HUD`는 `EventBus`로만 통신한다: `hp:changed`, `life:changed`, `bomb:changed`, `score:changed`, `chain:changed`, `power:changed`, `charge:changed`, `boss:spawn`, `boss:hp`, `boss:phase`, `ui:warning`, `ui:caption`, `ui:tip`.

## 3. 루프 · 결정론

| 항목 | 설계 | 이유 |
|---|---|---|
| 게임 로직 | **60 Hz 고정 타임스텝** + 누산기, 한 프레임에 최대 5스텝 따라잡기 | 120/144 Hz 모니터에서도 탄막 궤적과 타이밍이 같아야 함 |
| 렌더 | rAF마다, 이전·현재 상태 보간(선택) | 고주사율에서 부드러움 |
| 시간 점프 방지 | 탭 비활성 → 자동 일시정지, 복귀 시 누산기 초기화 | PDF QA: "복귀 시 시간 점프 없음" |
| 게임 시계 vs UI 시계 | 히트스톱·일시정지는 게임 시계만 멈춤. 트윈은 둘 중 하나에 명시적으로 연결 | 경고·전환 연출이 일시정지와 함께 멈추게 |
| 난수 | 스테이지 시작마다 시드 고정 RNG(예: mulberry32) | 리플레이, 버그 재현, 텔레메트리 |
| 입력 기록 | 고정 스텝마다 입력 비트마스크 기록 (P2: 리플레이) | 첫 피격 시간 측정(PDF 지표) |

## 4. 렌더링

### 4-1. 해상도 · 카메라

| 항목 | 설계 |
|---|---|
| 백버퍼 | 640k × 360k, k = 창에 들어가는 최대 정수(최소 2). 나머지는 레터박스 `#0B0B0F` |
| 월드 카메라 | zoom = k, `roundPixels`, 텍스처 필터 NEAREST (`pixelArt: true`) |
| UI 카메라 | 1920×1080 설계 좌표를 백버퍼에 맞게 스케일(zoom = k/3). 픽셀 프레임은 정수배로 맞아떨어지게 3의 배수 규격 사용 |
| HUD 숫자 | 비트맵 픽셀 폰트(고정폭) → k에 상관없이 선명 |
| 한글 · 긴 텍스트 | 웹폰트를 출력 해상도로 렌더(Text 객체의 resolution을 배율에 맞춤). 메뉴가 텍스트 위주인 옵션·도감은 DOM 오버레이도 대안(접근성 장점, 대신 키보드 포커스 통합 비용) |
| 웹폰트 로딩 | Boot에서 `document.fonts.load()`로 미리 로드를 끝낸 뒤 씬을 시작(로드 전 렌더되면 대체 폰트로 굳음) |

### 4-2. 레이어 (z-order, 아래 → 위)

| z | 레이어 | 내용 | 블렌드 |
|---|---|---|---|
| 0 | L0 하늘 | 하늘, 달, 구름 | 일반 |
| 1 | L1 원경 | 성당, 종루 | 일반 |
| 2 | L2 중후경 | 종탑, 다리, 새 | 일반 |
| 3 | L3 지형 | 묘비, 등불, 십자가 | 일반 (밝기 상한) |
| 4 | 적 본체 | 적, 보스 | 일반 |
| 5 | 플레이어 탄 | 아군 탄 | **가산**, 불투명도 옵션 |
| 6 | 플레이어 | 기체, 트레일 | 일반 + 림 |
| 7 | FX | 폭발, 파티클, 피격 플래시 | 가산 (불투명도 상한) |
| 8 | 아이템 | P/H/B/S, 소울 입자 | 일반 + 글로우 |
| 9 | L4 전경 + 안개 마스크 | 가지, 안개 띠, 검은 안개 | 일반 / 곱하기 |
| 10 | 예고 | 예고선, 표식, 진로선 | 가산 |
| 11 | **적탄** | 모든 적탄 | 일반 + 외곽 글로우 — **월드 최상단** |
| 12 | 히트박스 | 집중·차지 중 표시 | 일반 |
| 100+ | UI | HUD, 오버레이 (04 문서 §1-2) | — |

### 4-3. 후처리 이펙트

| 효과 | 적용 | 품질 단계 |
|---|---|---|
| 블룸 | 월드 카메라. 임계값을 높게 잡아 적탄 코어·광원만 번지게(배경은 밝기 상한이라 번지지 않음) | High만 |
| 색수차 · 스캔라인 | WARNING 오버레이 | High / Mid |
| 왜곡(충격파) | 차지 2단 발사, 보스 종 대타 | High만 |
| 비네트 | HP 위험, 안개 | 전부 |
| **자동 품질** | 60 fps 미달(평균 16.7 ms 초과)이 3초 지속되면 한 단계 낮춤 | High → Mid → Low |

> Phaser 3.60 이상의 내장 FX 파이프라인(Bloom, Glow, Vignette 등)을 우선 쓰고, 부족한 것만 커스텀 셰이더로 만든다. 픽셀 원본에는 글로우를 그려 넣지 않는다.

## 5. 데이터 주도 설계 (JSON)

코드 수정 없이 발사 시간·탄속·위치를 바꿀 수 있어야 한다(PDF). 아래는 05 문서 수치와 일치하는 발췌다.

### 5-1. 스테이지 타임라인 — `stages/stage1.timeline.json` (발췌)

```json
{
  "id": "s1_ashen_outskirts",
  "scroll": [
    { "tl": 0,   "speed": 48 },
    { "tl": 50,  "speed": 54, "ease": 2.0 },
    { "tl": 115, "speed": 36, "ease": 2.0 },
    { "tl": 160, "speed": 8,  "ease": 5.0 }
  ],
  "sections": [
    { "tl": 0,   "id": "A", "caption": "ASHEN CEMETERY|잿빛 묘역" },
    { "tl": 50,  "id": "B", "caption": "BROKEN CAUSEWAY|무너진 석교" },
    { "tl": 115, "id": "C", "caption": "VEIL OF BLACK FOG|검은 장막", "fog": { "radius": [150, 120], "until": 145 } }
  ],
  "events": [
    { "id": "W01", "tl": 3.0,  "spawn": "E01N", "formation": "SNAKE", "count": 5, "at": [672, 120], "interval": 0.3 },
    { "id": "W03", "tl": 11.5, "spawn": "E01F", "formation": "V5", "count": 5, "at": [672, 180],
      "fire": "leaderOnly", "onWipe": { "bonus": 2000, "drop": "P" } },
    { "id": "W09", "tl": 52.0, "spawn": "E03", "at": [672, 180], "stopAt": [520, 180], "tip": "charge" },
    { "id": "W11a", "tl": 66.0, "hazard": "HZ01", "x": 380 },
    { "id": "W14", "tl": 85.0, "spawn": "E05", "at": [672, 200], "stopAt": [500, 200], "drop": "B", "tip": "shieldPierce" },
    { "id": "W19", "tl": 132.0, "ui": "caution", "duration": 1.5 },
    { "id": "W20", "tl": 134.0, "midboss": "MB01", "pauseTimeline": true, "timeLimit": 30,
      "fallbackP0": { "spawn": "E05", "formation": "PINCER2", "ys": [110, 250] } },
    { "id": "W21", "tl": 136.0, "spawn": "E04", "path": "diagTop", "stopAt": [500, 110],
      "drop": { "if": "hp<max", "then": "H", "else": { "S": 5 } } },
    { "id": "BOSS", "tl": 165.0, "boss": "BOSS_ABADDON" }
  ]
}
```

### 5-2. 패턴 — `patterns.json` (발췌)

```json
{
  "E02_FAN3":       { "type": "fan",    "aim": "player", "count": 3, "spread": 30, "bullet": "B-02", "speed": 90,  "telegraph": 0.4 },
  "E03_FAN5":       { "type": "fan",    "aim": "player", "count": 5, "spread": 60, "bullet": "B-02", "speed": 100, "telegraph": 0.6, "repeat": 2, "repeatDelay": 1.2 },
  "ABD_TOLL_RING":  { "type": "radial", "count": 20, "bullet": "B-05", "speed": 70, "origin": "bell",
                      "repeat": 2, "repeatDelay": 0.5, "repeatAngleOffset": 9, "cycleAngleOffset": 4.5 },
  "ABD_SPIRITS":    { "type": "homing", "count": 4, "launchAngles": [60, 120, -60, -120], "bullet": "B-04",
                      "speed": [80, 100], "turnRate": 75, "homingTime": 2.0, "destructibleHp": 10, "maxAlive": 8 },
  "ABD_LAYERS":     { "type": "radialLayers", "layers": [60, 80, 100], "count": 20, "gap": 3,
                      "gapCenter": "player", "gapJitter": 20, "layerOffset": 10, "bullet": "B-02", "telegraph": 0.4 }
}
```

### 5-3. 보스 — `bosses/abaddon.json` (발췌)

```json
{
  "id": "BOSS_ABADDON",
  "hp": 9000,
  "hitboxes": [ { "part": "core", "r": 24, "mul": 1.0 }, { "part": "bell", "r": 44, "mul": 0.5 } ],
  "intro": { "warningAt": 1.5, "warningDur": 3.0, "descend": [5.5, 7.5], "barFill": [7.5, 8.8], "start": 8.8 },
  "transition": { "hitstop": 0.08, "cancelAt": 0.08, "stagger": 0.6, "reposition": [0.68, 1.68], "resumeAt": 1.7,
                  "lockBomb": true, "discardOverflow": true },
  "wrath": { "atCombatTime": 90, "bulletSpeedMul": 1.1 },
  "phases": [
    { "id": "P1", "name": "SILENT TOLL|침묵의 종", "hpTo": 0.65, "timer": 40, "cycle": 8.0, "anchor": [500, 180],
      "script": [
        { "t": 0.0, "telegraph": "bellGlow", "dur": 0.8 },
        { "t": 0.8, "pattern": "ABD_TOLL_RING" },
        { "t": 2.2, "telegraph": "armRaise", "dur": 0.5 },
        { "t": 2.7, "pattern": "ABD_MOURNING_FAN" },
        { "t": 4.2, "telegraph": "bellBack", "dur": 0.8 },
        { "t": 5.0, "pattern": "ABD_TOLL_WAVE" },
        { "t": 5.0, "move": "alignY", "range": [150, 210], "dur": 1.5 },
        { "t": 6.5, "rest": 1.5 }
      ] },
    { "id": "P2", "name": "LAMENT BELL|비탄의 종", "hpTo": 0.30, "timer": 40, "cycle": 9.0, "anchor": [470, 180] },
    { "id": "P3", "name": "FUNERAL COLLAPSE|장송의 붕괴", "hpTo": 0.0, "timer": 50, "cycle": 9.0, "anchor": [510, 150],
      "lastToll": { "hpBelow": 0.08, "layersInterval": 2.5, "lightningCount": 3 },
      "onTimeout": "silentCollapse" }
  ]
}
```

- 디자이너가 JSON만 고쳐도 반영되도록 개발 빌드에서는 **핫 리로드**(Vite) + 디버그 키(F1: 히트박스 표시, F2: TL 점프, F3: 보스 페이즈 점프, F4: 무적)를 제공한다.

## 6. 성능 예산

| 항목 | 예산 | 비고 |
|---|---|---|
| 프레임 | 60 fps (16.7 ms), 로직 ≤ 4 ms | Chrome 성능 프로파일로 확인 |
| 적탄 동시 | 일반 160 / 보스 220, **스트레스 테스트 400** | PDF: 250 스트레스 → 여유 있게 400 |
| 아군 탄 | 캐릭터당 80 | 풀 120 사전 할당 |
| 적 | 동시 30 | |
| 파티클 | 600 (Low 품질 300) | |
| 드로 콜 | ≤ 40 | 스프라이트는 아틀라스 1~3장으로 묶음 |
| 텍스처 | 아틀라스 장당 2048×2048 이하 | 저사양 GPU 호환 |
| 충돌 검사 | 원-원. 적탄 220 × 플레이어 1, 아군 탄 80 × 적 30 = 2,400회/스텝 | 공간 분할 불필요, 단순 루프 |
| 메모리 | 풀 사전 할당, 전투 중 `new` 금지 | GC 끊김 방지 |
| 초기 다운로드 | ≤ 8 MB (타이틀까지) | 스테이지 에셋은 프리뷰에서 로드 |
| 스테이지당 | ≤ 15 MB | 오디오가 대부분 |

## 7. 입력 · 오디오 · 저장

| 영역 | 설계 |
|---|---|
| 입력 판정 | 고정 스텝마다 **키 상태 폴링**(PDF: 키다운 이벤트보다 키 상태 기준). 차지 = 누른 시간 누적, 릴리스는 상태 변화로 감지. 폭탄은 엣지 입력 |
| 동시 입력 | 대각 이동 + 차지 + 폭탄이 충돌하지 않아야 함(PDF QA). 일부 키보드의 고스팅 문제 → 리바인딩으로 해결, 키 테스트 화면을 옵션에 제공 |
| 오디오 잠금 | 첫 사용자 입력(인트로)에서 `AudioContext` 재개 |
| 오디오 버스 | Master → BGM / SFX / UI. 피격 시 BGM 덕킹 −6 dB 0.3 s |
| 보스 BGM 레이어 | 같은 길이의 스템 3개(기본 / 합창 / 오르간 + 타악)를 동시에 시작하고 페이즈마다 볼륨만 올림 → 박자가 어긋나지 않음 |
| 포맷 | OGG + M4A(AAC) 두 포맷 (브라우저 호환) |
| 저장 키 | `er.v1.settings`, `er.v1.scores`, `er.v1.flags`(튜토리얼 확인, 도감 해금, 마지막 캐릭터) |
| 저장 규칙 | 버전 필드 포함, 모든 접근을 try/catch로 감쌈(사생활 보호 모드에서 실패 가능), 실패해도 게임은 진행 |

## 8. 구현 우선순위

### 8-1. 우선순위 정의

| 등급 | 범위 | 완료 정의 |
|---|---|---|
| **P0 수직 슬라이스** | 부트·Press Any Key, 타이틀(메뉴), 캐릭터 선택(3인), 인게임 HUD(일반·보스 모드), Stage 1 전 구간(미니보스는 대체안), 경고, 보스 아바돈 3페이즈, 일시정지, 게임오버(컨티뉴 없음), 스테이지 클리어(랭크), 옵션(볼륨·키·창 모드) | 처음 켜서 보스 격파 → 클리어 화면까지 오류 없이 진행, 60 fps 유지 |
| **P1 품질** | 인트로 연출, 프롤로그, 조작 안내, 스테이지 프리뷰, 미니보스 그레이븐, 컨티뉴, 최종 결과, 옵션 전체, 폭탄 컷인, 후처리 FX, 사운드 전체 | 시인성·프레임 기준 충족, 플레이테스트 지표 측정 가능 |
| **P2 확장** | Stage 2~6, 엔딩, 도감, 게임패드, 난이도(Hard: HP1 × 잔기 3), 로컬 랭킹, 리플레이 | MVP 안정화 후 별도 일정 |

### 8-2. 10주 로드맵 (2~3인 기준, PDF 일정과 정렬)

| 주 | 개발 | 아트 | UI | 검수 지점 |
|---|---|---|---|---|
| 1~2 | 고정 스텝, 입력, 이동·자동 사격·차지·폭탄·충돌, 풀 | 플레이어 3인 그레이박스 스프라이트, 탄 7종 | 토큰·폰트·9-slice 프레임 | **빈 배경에서도 전투가 재미있는가** |
| 3~4 | 3인 차별화, PatternEngine, 적 5종, 아이템, 점수·Chain | 적 5종 스프라이트, 아이템 4종 | HUD 일반 모드(04 §2-1) | 탄 구분 · 밸런스 안정 |
| 5~6 | TimelineSpawner + Stage 1 JSON, BossController(전환·타이머), 기믹 3종 | Stage 1 배경 4레이어, 보스 아바돈 | 타이틀, 선택, 경고, 보스 HUD, 일시정지, 클리어 | **첫 4분 50초 완주 (수직 슬라이스)** |
| 7~8 | Stage 2 + 보스 2, 컨티뉴, 프리뷰, 미니보스 | Stage 2 아트, 일러스트 통합 | 프리뷰, 게임오버, 옵션 전체 | 8~12분 완주 |
| 9~10 | 사운드, 카메라 FX, 자동 품질, 최적화, 텔레메트리 | 이펙트 폴리시 | 프롤로그, 결과, 접근성 옵션 | 버그 수정 · 난이도 튜닝 |

> **원칙 (PDF 22번)**: 첫 스테이지가 완성되기 전에는 콘텐츠 개수를 늘리지 않는다.

## 9. 화면별 제작 포인트 (HTML5)

| 화면 | 핵심 구현 | 재사용 컴포넌트 | 기술 리스크 | 완료 정의 |
|---|---|---|---|---|
| 부트/인트로 | 웹폰트 선로딩, 오디오 잠금 해제, 진행 표시 | Caption | 폰트 로드 전 렌더 → 대체 폰트 | 첫 키 입력 후 BGM이 확실히 재생됨 |
| 타이틀 | TileSprite 패럴랙스 3장, 입자 2개, 로고 광택 스윕(마스크 트윈) | MenuList, Button | 입자 과다 | 메뉴 키보드·마우스 포커스가 항상 일치 |
| 캐릭터 선택 | 샷 프리뷰 = 실제 PlayerController를 RenderTexture에 렌더, 일러스트 지연 로드 | StatBar, Panel9, KeyHints | RenderTexture 해상도·필터(NEAREST) | 밸런스 수정이 프리뷰에 자동 반영 |
| 스테이지 프리뷰 | 로더 진행률 → 버튼 룬 점등, 최소 체류 2 s | Button(로딩 상태) | 느린 네트워크에서 Begin 대기 | 로드 완료 전 Begin 비활성 |
| 인게임 HUD | HUD 씬 병렬, 이벤트 구동 갱신, 겹침 페이드(사각형-원 판정) | SegmentBar, ChargeGauge | 매 프레임 텍스트 갱신 → 성능 저하 | 값이 바뀔 때만 다시 그림 |
| 전투 | 고정 스텝, 풀, 레이어 z, 적탄 최상단 | — | GC 끊김, 고주사율 차이 | 400발 스트레스에서 60 fps |
| 경고 | 오버레이 + 게임 시계 트윈 | Caption, Panel9(warn) | 일시정지 시 연출 계속 진행 | 일시정지하면 경고도 정지 |
| 보스전 | 페이즈 스크립트 실행기, 전환 시퀀스, 무적 해칭, 분노 | BossBar | 페이즈 건너뛰기, 전환 중 피격 | 05 §12-6 예외 11개 전부 통과 |
| 일시정지 | 씬 pause, 블러(다운샘플 RenderTexture), 확인창 | MenuList, Dialog | 블러 비용 | 재개 시 0.5 s 페이드, 시간 점프 없음 |
| 게임오버 | 타임스케일 슬로모션, 카운트다운, 컨티뉴 상태 복원 | Countdown, Button | 컨티뉴 후 상태 불일치 | 컨티뉴 후 점수 0·파워 −1·HP 최대 |
| 스테이지 클리어 | 결과 계산, 카운트업, 랭크 판정 | RankStamp | — | 2단 확인 입력 |
| 옵션 | 즉시 적용 + 저장, 키 리바인딩·중복 검사 | Slider, Toggle, KeyHints | 저장 실패(사생활 모드) | 새로고침 후 설정 유지(PDF QA) |

## 10. 디버그 · QA 도구 (개발 빌드 전용)

| 키 | 기능 |
|---|---|
| F1 | 모든 히트박스 · 적탄 판정 원 표시 |
| F2 | TL 점프(구간 A/B/C/휴지/보스) |
| F3 | 보스 페이즈 강제 전환 |
| F4 | 무적 토글 |
| F5 | 적탄 400발 스트레스 테스트 |
| F6 | 텔레메트리 로그 다운로드(JSON) |
| ` | FPS · 탄 수 · 드로 콜 오버레이 |
