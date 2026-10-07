# ODD HAUS — *Nothing Is Useless* · 50s Brand Film

> **쓸모없는 것은 없다. 모두에게는 집이 필요하다.**
> *Nothing is useless. Everyone needs a home.*

ODD HAUS 브랜드 자체를 위한 50초 감성 광고의 기획·제작 패키지.
어둡고 힙한 밤의 집에서 시작해, 무서운 집주인이 사실은 모두의 자리를 만들어 두었다는 반전으로 따뜻하게 끝난다.

| | |
|---|---|
| **한 줄 콘셉트** | 들키면 쫓겨날 줄 알았던 '쓸모없는 것들'이, 사실은 처음부터 자기 자리가 마련된 집에 살고 있었다. |
| **추천 제목** | ODD HAUS — Nothing Is Useless |
| **구조** | 7씬 22샷 · 50.0초 · 24fps · 2:1 레터박스 |
| **전환점** | 35.9s — Mr. ODD가 작은 친구들 높이에 달린 스위치를 '딸깍' 켠다 |

## 결과물

| 파일 | 내용 | 브리프 항목 |
|---|---|---|
| [`docs/01_creative_treatment.md`](docs/01_creative_treatment.md) | 제목 3안, 한 줄 콘셉트, 시놉시스, 7씬 22샷 스토리보드, 카메라·조명·감정 연출, 카피, 내레이션, 컷다운 | 1–7 |
| [`docs/02_build_spec.md`](docs/02_build_spec.md) | 스케일 시트, 에셋 리스트, 씬별 캐릭터 배치·애니메이션 포인트, 그레이드 키, 오디오 큐 시트, 제작 파이프라인 | 8 |
| [`docs/03_production_prompts.md`](docs/03_production_prompts.md) | 스타일·캐릭터·스케일 락, 네거티브, 원샷 마스터 프롬프트, 22샷 비디오 프롬프트, 키 비주얼·보드·라인업·엔드카드 이미지 프롬프트 | 9 |
| [`spec/timeline.json`](spec/timeline.json) | **단일 소스** — 씬, 샷, 카메라, 조명, 캐릭터 배치, 애니메이션 포인트, 슈퍼, 사운드 큐 | 8 |
| [`spec/characters.json`](spec/characters.json) | 캐릭터 아이덴티티·스케일 락, 금지 사항, '쓸모'의 회수 | 8 |
| `renders/odd_haus_animatic_50s.mp4` | 50초 애니매틱 — 클린 컷 (1080p, 템프 사운드 포함) | 영상 |
| `renders/odd_haus_animatic_50s_review.mp4` | 리뷰 컷 (720p) — 씬·샷 ID, 타임코드, 샷별 연출 노트 번인 | 영상 |
| `renders/odd_haus_score.wav` | 합성 템프 스코어 + 사운드 디자인 (48kHz 스테레오) | 영상 |

## 애니매틱 다시 만들기

```bash
./animatic/build.sh        # 폰트 다운로드 → 스코어 합성 → 클린/리뷰 컷 렌더 (renders/)
```

- 필요 환경: Python 3.10+ (`numpy`, `Pillow`, `fonttools`), `ffmpeg`(libx264/aac), 폰트 다운로드용 `npm`·`pip`.
- 타이밍·카메라·사운드를 바꾸려면 `spec/timeline.json`을 고치고 다시 실행한다. 특정 시점만 확인하려면
  `python3 animatic/render.py --stills 22.1,35.95,47 --scale 0.5`.
- 애니매틱은 `reference/`의 키 비주얼 포스터와 스토리보드 보드 두 장을 가상 카메라로 연출한 **프리비즈**다.
  본 제작 영상은 `docs/03_production_prompts.md`의 프롬프트와 `docs/02_build_spec.md`의 파이프라인으로 만든다.

## 폴더 구조

```
reference/   레퍼런스 이미지 (키 비주얼 포스터, 50초 스토리보드 보드)
spec/        timeline.json · characters.json — 모든 문서와 렌더의 원본
docs/        크리에이티브 트리트먼트 · 제작 구조 · 제작 프롬프트
animatic/    render.py (영상) · audio.py (사운드) · textdraw.py (한글 폰트 폴백) · build.sh · fetch_fonts.sh
renders/     렌더 결과
```

폰트는 모두 SIL Open Font License(Cormorant Garamond, Patrick Hand SC, Nanum Myeongjo, NanumGothic)이며, 빌드 시 내려받는다(저장소에는 포함하지 않음).
