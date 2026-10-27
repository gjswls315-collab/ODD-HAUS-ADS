# ECLIPSE REQUIEM — 플레이 가능한 Stage 1 빌드

`../docs/`의 시각 기획서·UI 설계서·Stage 1 구성서를 그대로 구현한 **HTML5 수직 슬라이스**입니다.
타이틀 → 프롤로그 → 캐릭터 선택 → 스테이지 브리핑 → Stage 1 전 구간(미니보스 · 보스 3페이즈) → 클리어/랭크까지 한 판을 끝까지 플레이할 수 있습니다.

- **바로 플레이**: `release/eclipse-requiem.html` 파일 하나를 브라우저(Chrome/Edge 권장)로 열면 됩니다. 외부 에셋 없이 실행됩니다(폰트만 Google Fonts에서 불러오며, 오프라인이면 시스템 글꼴로 대체).
- 그래픽과 사운드는 모두 **코드로 생성**합니다(절차적 픽셀아트 + WebAudio 합성). 정식 아트·사운드로 교체하기 전의 임시 에셋입니다.

## 조작

| 입력 | 동작 |
|---|---|
| 방향키 / WASD | 이동 (8방향) |
| 자동 | 기본 공격 (옵션에서 끄면 Z로 수동 사격) |
| SPACE 길게 → 떼기 | 차지샷 (0.6초 1단 / 1.2초 2단, 충전 중 이동 85%) |
| X | 폭탄 (적탄 소거 + 광역 피해 + 무적) |
| SHIFT | 집중 이동 (60%) + 히트박스 표시 |
| ESC / P | 일시정지 |
| 메뉴 | ↑↓←→ 이동 · ENTER/SPACE/Z 확인 · ESC/X 취소 · 마우스 가능 |
| 게임패드 | 스틱/D-패드 이동 · A 차지 · B 폭탄 · RB/LB 집중 · START 일시정지 |

키 재지정, 자동 발사, 차지 방식(홀드/토글), 화면 흔들림, 플래시 감소, 배경 어둡게, HUD 불투명도, 플레이어 탄 표시 강도, 정수 배율, 전체 화면은 **OPTIONS**에서 바꿀 수 있고 `localStorage`에 저장됩니다.

## 구현 범위 (docs 대비)

| 영역 | 구현 내용 | 근거 문서 |
|---|---|---|
| 화면 | 인트로(오디오 잠금 해제), 타이틀(Attract/Menu), 프롤로그 4컷, 캐릭터 선택(실시간 샷 프리뷰), 조작 안내(첫 실행), 스테이지 브리핑, 인게임, 일시정지, 옵션, 게임오버/컨티뉴, 스테이지 클리어(랭크), 크레딧 | 01 |
| HUD | 상태/점수/차지 패널, 보스 모드 레이아웃 전환, 보스 HP 블록(페이즈 룬·잔상·무적 해칭·분노), WARNING/CAUTION, 구간 캡션, 튜토리얼 팁, 폭탄 컷인, 겹침 페이드, HP 위험 비네트 | 02, 04 |
| 캐릭터 | 세라핀 / 녹티스 / 모르가나 — 속도·HP·사격·차지 1단/2단·폭탄 모두 다름 | 00 §6 |
| Stage 1 | 웨이브 W01–W22, 구간 A/B/C/휴지/D, 검은 안개(시야 제한), 낙뢰 십자가, 붕괴 파편, 고정 드롭 | 05 §4–§9 |
| 미니보스 | 묘지기 그레이븐 (30초 제한, 사슬 채찍 / 관 폭발) — TL 정지 | 05 §10 |
| 보스 | 벨키퍼 아바돈 — 등장 시퀀스(B+), 3페이즈 패턴, 전환(TR+: 초과 피해 폐기·탄 소거·폭탄 잠금), 페이즈 타이머, 분노(90초), 마지막 종, 격파(D+), 시간 초과(Silent Collapse) | 05 §11–§12 |
| 점수 | 체인 배율, 그레이즈, 편대 전멸 보너스, 페이즈/노미스/노봄 보너스, 랭크 C~EX | 01 SCR-11, 05 |
| 사운드 | 종(비조화 배음 합성), 합창, 오르간, 효과음 전부 합성. BGM 4곡(타이틀·스테이지·보스 3레이어·승리) | 05 §13 |

### 문서와 다른 점

| 문서 | 이 빌드 | 이유 |
|---|---|---|
| 엔진: Phaser 3 | **의존성 없는 Canvas 2D + TypeScript** | 640×360 픽셀 월드와 1920×1080 UI 레이어를 정확히 분리(06 §4-1)하고, 단일 HTML 파일로 배포하기 위해. 모듈 구조(PlayerController·PatternEngine·BossController 등)는 06 문서를 그대로 따름 |
| 보스 몸통: 접촉 판정만 | 몸통·두건에 맞은 탄은 **피해 ×0.2**로 흡수 | 탄이 거대한 몸을 그대로 통과하면 어색해서. 핵(×1.0)·종(×0.5)은 문서대로 |
| 데이터: JSON 파일 | TypeScript 데이터(`game/defs.ts`, `game/director.ts`) | 단일 파일 빌드. 구조는 06 §5 스키마와 같음 |

## 개발

```bash
npm install
npm run dev        # http://localhost:5173  (?debug 를 붙이면 F2: 구간 점프, F3: 보스 페이즈 넘기기, F4: 무적)
npm run build      # 타입 검사 → dist/ → release/eclipse-requiem.html (단일 파일)
```

URL 파라미터: `?play=seraphine|noctis|morgana` 바로 Stage 1 시작, `&tl=165` 타임라인 위치(초)부터 시작(165 = 보스), `?artsheet` 생성된 스프라이트 시트 보기.

## 코드 구조

```text
src/
  core/      app(씬 매니저) · input(키 상태 폴링, 게임패드, 마우스) · save(localStorage) · math(RNG, 이징)
  gfx/       renderer(640x360 월드 + 고해상 UI 2레이어) · pixelfont(5x7 비트맵) · ui(패널·버튼·키캡)
  gfx/art/   heroines · enemies · bosses · items · backdrop — 절차적 픽셀아트 생성기
  audio/     audio.ts — 효과음 합성 + 시퀀서 BGM + 생성형 성당 리버브
  game/      world · player · bullets · enemies · items · hazards · boss · midboss · director(Stage 1 타임라인) · stagebg · fx
  ui/        hud · menu · options · logo
  scenes/    intro · title · prologue · select · preview · game · clear
```
