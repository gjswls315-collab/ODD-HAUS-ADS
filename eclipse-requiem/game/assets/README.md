# ECLIPSE REQUIEM — 그래픽 에셋 사양 · 교체 가이드

게임 그래픽은 전부 이 폴더의 **이미지 파일**이다. 코드(`src/`)는 파일을 읽어 그릴 뿐이고 도형으로 캐릭터·적·배경을 그리지 않는다.
같은 파일 이름·태그 이름으로 덮어쓰면 코드 수정 없이 그림이 바뀐다.

> **현재 들어 있는 PNG는 임시(placeholder) 아트다.** 이미지 생성 AI로 만든 것이 아니라 `tools/art/*.mjs` 스크립트가
> 팔레트 색으로 픽셀을 찍어 만든 것이며, 아티스트 작업물로 교체하는 것을 전제로 한다. 재생성: `node tools/art/build.mjs [stage1|combat|heroes|enemies|boss|ui]`

## 1. 공통 규칙

| 항목 | 규칙 |
|---|---|
| 기준 해상도 | 논리 해상도 **640×360**. 1280×720에서 정수 2배, 1920×1080에서 3배로 확대(최근접 보간). 1 픽셀 = 게임 1 픽셀 |
| 픽셀 밀도 | 모든 스프라이트·배경·UI는 같은 1× 픽셀 그리드. 회전·확대된 픽셀 금지 (방향이 필요한 탄·무기는 **방향별 프레임**으로 미리 그린다) |
| 팔레트 | `palette.json` / `palette.gpl` (68색, ramp N·S·T·B·Z·M·R·G·A·V·U). 팔레트 밖 색 사용 금지. 반투명은 안개·비전 마스크만 |
| 외곽선 | 그림자 쪽 N0 셀아웃, 광원 쪽은 인접색을 어둡게. 주광원은 우상단 월식(M0~M2 림), 위험 요소는 R 계열 |
| 파일 형식 | PNG RGBA (투명 배경) |
| 스프라이트 시트 | PNG + 같은 이름의 JSON (**Aseprite → Export Sprite Sheet**, JSON Data: **Array**, Meta: **Tags** + **Slices** 체크, Trim은 꺼도 되고 켜도 된다) |
| 애니메이션 | `meta.frameTags` 의 태그 이름으로 재생. 프레임 duration(ms) 그대로 사용. direction `forward`/`pingpong` |
| 기준점(pivot) | `meta.slices` 의 **1×1 슬라이스 `pivot`** (없으면 프레임 중앙). 게임은 오브젝트 좌표에 이 점을 맞춘다 |
| 부착점 | 같은 방식의 1×1 슬라이스: 보스 `head`/`armF`/`armB`/`bell`, 종 `mouth`(탄 발사구), 팔 `hook`(탄 발사구). 키 프레임별로 위치를 바꿀 수 있다 |
| 누락 파일 | 게임이 멈추지 않고 **자홍/검정 체커**를 그린 뒤 콘솔에 `[assets] missing <key>` 를 남긴다 (조잡한 대체 그림으로 덮지 않음) |

### Aseprite 내보내기 설정
1. 태그(Tag)를 아래 표의 태그 이름 그대로 만든다 (대소문자 구분).
2. 기준점은 Slice 도구로 1×1 슬라이스 `pivot` 을 찍는다. 부착점도 같은 방식(`mouth`, `hook`, `head` …).
3. File → Export Sprite Sheet → Layout: Packed 또는 By Rows / Output: `<이름>.png` + JSON Data(Array) / Meta: Tags, Slices.
4. 결과 두 파일을 같은 경로에 덮어쓴다. 빌드(`npm run build`) 시 단일 HTML에 자동 포함된다.
5. `?artsheet` 로 실행하면 불러온 모든 시트·태그를 게임 안에서 재생해 확인할 수 있다 (←→ 시트, ↑↓ 태그).

## 2. 폴더 구조

```
assets/
  palette.json / palette.gpl        v2 팔레트
  stage1/                           Stage 1 배경 레이어 (단일 이미지) + stage.json (배치)
  sprites/                          전투 스프라이트 시트 (PNG + JSON)
  ui/                               HUD 아이콘, 로고, 초상화, 5×7 비트맵 폰트
  fonts/                            Galmuri11 / 11-Bold / 9 (SIL OFL 1.1, OFL-Galmuri.md)
```

## 3. Stage 1 배경 (`stage1/stage.json`)

레이어마다 `factor`(플레이 레이어 대비 스크롤 속도), `y`, 구간별 타일(`tiles`)을 지정한다. 구간: A 잿빛 묘역, B 무너진 둑길, C 검은 안개, R 휴지, D 침묵의 종탑.

| 레이어 | 파일 | 크기 | factor | 비고 |
|---|---|---|---|---|
| sky | sky.png | 640×360 | 0 | 고정. 별·밤하늘 그라데이션은 디더 픽셀로 |
| clouds | clouds.png | 1280×110 | 0.05 (+drift) | 가로 반복, 층운 |
| moon | moon.png | 84×84 | 0 | **붉은 월식** (R 계열 + 디더 헤일로) |
| bolt | bolt.png+json | 40×170 | — | 배경 낙뢰 `white`/`red` 3프레임 |
| far | far.png | 1280×160 | 0.12 | 원경 도시·대성당 실루엣, 가로 반복 |
| landmark | belfry.png / belfry_broken.png | 232×300 | — | 무너진 종탑. 보스 P3에서 broken 으로 교체 |
| mid | mid_cemetery / mid_ravine / mid_ruins | 960×200 | 0.32 | 구간 전환 시 디더 디졸브(`fade`) |
| near | near_wall / near_bridge / near_ruins | 640×170 | 0.62 | 화면 밖에서 들어오는 타일만 교체(`queue`) |
| ground | ground_graves / ground_bridge / ground_rubble | 640×44 | 1.0 | 플레이 레이어 바닥 |
| fog | fog_a / fog_b | 640×128 | 0.7~1.1 | 반투명(N0 알파) 안개 띠 3장 |
| fore | fore_top 960×64 / fore_bottom 960×34 | | 1.4 | 전경 가지·사슬·철책, 탄막 아래에 그려짐 |

가독성 규칙: 배경은 N/S/T 저채도 명도 0~45%, 적탄(R 고채도)과 플레이어 탄(G/A/V)이 항상 배경보다 밝다. 전경은 화면 상하 가장자리만.

## 4. 스프라이트 시트 전체 목록 (태그[프레임 수] 프레임 크기 p(pivot) +부착점)

| 키 | 시트 크기 | 태그 |
|---|---|---|
| `sprites/boss_abaddon` | 998×715 | body[2] 132×150 p(64,64) +head/armF/armB/bell<br>body_p2[2] 132×150 p(64,64) +head/armF/armB/bell<br>body_p3[2] 132×150 p(64,64) +head/armF/armB/bell<br>body_crumble[6] 132×150 p(64,64) +head/armF/armB/bell<br>head[1] 42×42 p(28,32)<br>head_scream[2] 42×42 p(28,32)<br>head_hurt[1] 42×42 p(28,32)<br>bell_c0[5] 110×100 p(55,10) +mouth<br>bell_c1[5] 110×100 p(55,10) +mouth<br>bell_c2[5] 110×100 p(55,10) +mouth<br>bell_c3[5] 110×100 p(55,10) +mouth<br>armF_down[1] 120×120 p(80,44) +hook<br>armF_raise[1] 120×120 p(80,44) +hook<br>armF_reach[1] 120×120 p(80,44) +hook<br>armB[1] 50×50 p(10,34)<br>core[4] 16×20 p(8,10)<br>core_hit[1] 16×20 p(8,10)<br>bellglow[3] 84×28 p(42,4)<br>shadow[1] 320×90 p(160,45) |
| `sprites/bullets` | 243×35 | B01[2] 9×9 p(4,4)<br>B02[2] 11×11 p(5,5)<br>B02r[2] 11×11 p(5,5)<br>B03[16] 15×15 p(7,7)<br>B04[2] 13×13 p(6,6)<br>B05[2] 19×19 p(9,9)<br>B06[2] 13×13 p(6,6) |
| `sprites/enemies` | 510×304 | bat[4] 26×18 p(12,9)<br>candle[4] 18×32 p(9,18)<br>candle_tele[2] 18×32 p(9,18)<br>skeleton[2] 36×48 p(18,24)<br>skeleton_tele[2] 36×48 p(18,24)<br>cleric[2] 46×54 p(24,28)<br>cleric_tele[2] 46×54 p(24,28)<br>sentinel[2] 74×82 p(38,40)<br>sentinel_tele[1] 74×82 p(38,40)<br>sentinel_break[1] 74×82 p(38,40)<br>graven[2] 124×124 p(58,62)<br>graven_lash[1] 124×124 p(58,62)<br>graven_open[1] 124×124 p(58,62) |
| `sprites/fx` | 512×1175 | spark[4] 9×9 p(4,4)<br>spark_metal[4] 9×9 p(4,4)<br>hit_core[3] 13×13 p(6,6)<br>burst_s[6] 24×24 p(12,12)<br>burst_m[8] 40×40 p(20,20)<br>burst_l[10] 64×64 p(32,32)<br>burst_boss[10] 64×64 p(32,32)<br>ring[6] 48×48 p(24,24)<br>ring_red[7] 80×80 p(40,40)<br>graze[3] 7×7 p(3,3)<br>pickup[4] 13×13 p(6,6)<br>cancel[4] 9×9 p(4,4)<br>ash[3] 3×3 p(1,1)<br>debris[4] 14×14 p(7,7)<br>rubble[4] 28×28 p(14,14)<br>gravecross[3] 22×54 p(11,53)<br>bellshard[6] 18×18 p(9,9)<br>lightning[3] 28×120 p(14,0)<br>lightning_tele[2] 11×9 p(5,0)<br>belldrop[1] 44×48 p(22,40)<br>belldrop_mark[2] 56×12 p(28,6)<br>dust[4] 20×14 p(10,12)<br>warn[2] 11×11 p(5,5)<br>teledot[2] 3×3 p(1,1)<br>hitbox[2] 9×9 p(4,4)<br>vision[2] 320×320 p(160,160) |
| `sprites/hero_morgana` | 512×93 | fly[4] 56×46 p(28,26)<br>up[2] 56×46 p(28,26)<br>down[2] 56×46 p(28,26)<br>charge[4] 56×46 p(28,26)<br>hit[2] 56×46 p(28,26)<br>cast[3] 56×46 p(28,26) |
| `sprites/hero_morgana_fx` | 497×158 | shot[5] 9×9 p(4,4)<br>spirit[16] 11×11 p(5,5)<br>orb[4] 15×15 p(7,7)<br>muzzle[3] 11×11 p(5,5)<br>aura[4] 44×44 p(22,22)<br>aura_full[4] 44×44 p(22,22)<br>release[4] 34×34 p(17,17)<br>ghost[4] 18×24 p(9,12)<br>death[8] 56×56 p(28,28) |
| `sprites/hero_noctis` | 512×93 | fly[4] 56×46 p(28,26)<br>up[2] 56×46 p(28,26)<br>down[2] 56×46 p(28,26)<br>charge[4] 56×46 p(28,26)<br>hit[2] 56×46 p(28,26)<br>cast[3] 56×46 p(28,26) |
| `sprites/hero_noctis_fx` | 502×343 | shot[2] 11×2 p(10,0)<br>muzzle[3] 11×11 p(5,5)<br>charge1[3] 30×11 p(28,5)<br>scythe[8] 25×25 p(12,12)<br>aura[4] 44×44 p(22,22)<br>aura_full[4] 44×44 p(22,22)<br>release[4] 34×34 p(17,17)<br>storm[4] 56×120 p(28,0)<br>strike[4] 25×25 p(12,12)<br>death[8] 56×56 p(28,28) |
| `sprites/hero_seraphine` | 512×93 | fly[4] 56×46 p(28,26)<br>up[2] 56×46 p(28,26)<br>down[2] 56×46 p(28,26)<br>charge[4] 56×46 p(28,26)<br>hit[2] 56×46 p(28,26)<br>cast[3] 56×46 p(28,26) |
| `sprites/hero_seraphine_fx` | 503×615 | shot[2] 14×3 p(12,1)<br>muzzle[3] 11×11 p(5,5)<br>charge1[3] 50×7 p(46,3)<br>charge2[3] 72×9 p(68,4)<br>cross[4] 21×31 p(10,15)<br>aura[4] 44×44 p(22,22)<br>aura_full[4] 44×44 p(22,22)<br>release[4] 34×34 p(17,17)<br>pillar[4] 30×360 p(15,0)<br>halo[4] 120×120 p(60,60)<br>death[8] 56×56 p(28,28) |
| `sprites/items` | 219×13 | P[4] 13×13 p(6,6)<br>H[4] 13×13 p(6,6)<br>B[4] 13×13 p(6,6)<br>S[4] 9×11 p(4,5)<br>mote[2] 5×5 p(2,2) |
| `stage1/belfry` | 232×300 | (image) |
| `stage1/belfry_broken` | 232×300 | (image) |
| `stage1/bolt` | 245×170 | white[3] 40×170 p(20,0)<br>red[3] 40×170 p(20,0) |
| `stage1/clouds` | 1280×110 | (image) |
| `stage1/far` | 1280×160 | (image) |
| `stage1/fog_a` | 640×128 | (image) |
| `stage1/fog_b` | 640×128 | (image) |
| `stage1/fore_bottom` | 960×34 | (image) |
| `stage1/fore_top` | 960×64 | (image) |
| `stage1/ground_bridge` | 640×44 | (image) |
| `stage1/ground_graves` | 640×44 | (image) |
| `stage1/ground_rubble` | 640×44 | (image) |
| `stage1/mid_cemetery` | 960×200 | (image) |
| `stage1/mid_ravine` | 960×200 | (image) |
| `stage1/mid_ruins` | 960×200 | (image) |
| `stage1/moon` | 84×84 | (image) |
| `stage1/near_bridge` | 640×170 | (image) |
| `stage1/near_ruins` | 640×170 | (image) |
| `stage1/near_wall` | 640×170 | (image) |
| `stage1/sky` | 640×360 | (image) |
| `ui/font5x7` | 96×32 | (image) |
| `ui/hud` | 150×16 | hp[3] 9×9 p(4,4)<br>bomb[2] 9×10 p(4,5)<br>pip[4] 5×8 p(2,4)<br>icon_seraphine[1] 16×16 p(8,8)<br>icon_noctis[1] 16×16 p(8,8)<br>icon_morgana[1] 16×16 p(8,8)<br>cursor[2] 7×7 p(3,3)<br>skull[1] 9×9 p(4,4) |
| `ui/logo` | 160×78 | (image) |
| `ui/portraits` | 290×148 | seraphine[1] 96×148 p(48,147)<br>noctis[1] 96×148 p(48,147)<br>morgana[1] 96×148 p(48,147) |

### 용도 메모
- **hero_<id>** : `fly`(기본 비행) `up`/`down`(상하 이동 기울기) `charge`(차지 자세) `hit`(피격) `cast`(차지 발사·폭탄). 히트박스는 pivot(몸 중앙) 기준 반지름 3px.
- **hero_<id>_fx** : 기본탄 `shot`(pivot=탄 앞끝), 총구 `muzzle`, 차지 오라 `aura`/`aura_full`, 발사 `release`, 차지탄(세라핀 `charge1/2` 창, 녹티스 `charge1` 관통탄 · `scythe` 8방향), 모르가나 `shot` 5각도·`spirit` 16방향·`orb`, 폭탄(세라핀 `pillar`+`halo`+`cross`, 녹티스 `storm`+`strike`, 모르가나 `ghost`), `death`.
- **enemies** : `<종류>` 대기·이동, `<종류>_tele` 공격 예고(0.4~0.6초), `sentinel_break` 가드 브레이크, 미니보스 `graven*`.
- **boss_abaddon** : 파츠 합성(뒤→앞: shadow, armB, bell_cN, bellglow, body*, head*, core, armF_*). 종 `bell_c0~c3` = 균열 단계, 각 5프레임 = 기울기 -8/-4/0/4/8°. `mouth` 슬라이스가 탄 발사 위치, `armF_*` 의 `hook` 이 갈고리 탄 위치. 히트 판정: 코어 r16(×1), 종 r30(×0.5), 머리 r12·로브 r38(×0.2).
- **bullets** : 적탄. B03(바늘)만 16방향 프레임(22.5° 단위). 히트 반지름은 `src/game/defs.ts` BULLETS.
- **fx** : 공용 이펙트(피격 `spark`/`spark_metal`/`hit_core`, 폭발 `burst_s/m/l/boss`, 링 `ring`/`ring_red`, 그레이즈, 아이템 획득, 탄 소거, 재, 파편 `debris`/`rubble`/`bellshard`, 낙뢰 `lightning`+`lightning_tele`+`gravecross`, 종 낙하 `belldrop`+`belldrop_mark`, 먼지, 경고 `warn`, 예고 점 `teledot`, 히트박스 `hitbox`, 검은 안개 시야 `vision` 2프레임(반경 150/120)).
- **ui/hud** : HP `hp`[가득/빈/위험], 폭탄 `bomb`[있음/없음], 파워 `pip`[off/G/A/V], 캐릭터 아이콘 16×16, 메뉴 커서, 난이도 해골.
- **ui/portraits** : 캐릭터 선택·컷인용 전신 96×148 (pivot 발끝).
- **ui/logo.png** : 타이틀 로고 160×78. **ui/font5x7** : 숫자·라틴 대문자 5×7 비트맵 폰트(`font5x7.font.json` 에 문자 순서).

## 5. 우선 교체 권장 순서 (아트 리소스 제작 사양)

| 순위 | 대상 | 이유 / 요구 |
|---|---|---|
| 1 | hero_seraphine / noctis / morgana (+_fx) | 화면에서 가장 오래 보임. 56×46 프레임 안, 실루엣 폭 30~40px, 비행 4f·기울기 2f·차지 4f·피격 2f·캐스트 3f |
| 2 | boss_abaddon 파츠 | 화면 높이 50% 이내(현재 약 51%), 부착 슬라이스 유지. 공격 준비(head_scream·bellglow)·피격(core_hit)·페이즈 변화(body_p2/p3, bell_c1~3)·붕괴(body_crumble 6f) |
| 3 | enemies | 각 종류 대기 + `_tele` 예고 포즈가 확실히 구분될 것 |
| 4 | stage1 레이어 | mid/near 구간 타일 3종씩, 좌우 이음매 없이 반복 |
| 5 | fx / bullets | 적탄은 R 계열 + 흰 코어 + N0 외곽, 아군 탄은 반투명 대신 캐릭터 색 저채도 |
| 6 | ui (초상화, 로고) | 초상화는 현재 가장 거친 임시 아트 |
