# ECLIPSE REQUIEM v2 — 화면 시안용 이미지 프롬프트

Visual Design Bible v2.0 §6의 원본입니다. `src/build.py`가 이 파일을 읽어 바이블 페이지에 넣습니다.

## 사용 규칙

- 생성 이미지는 **방향 확인용 시안**입니다. 생성기는 픽셀 그리드와 팔레트를 지키지 못하므로, 결과물은 그대로 에셋이 될 수 없습니다(그 자체가 '가짜 픽셀아트').
- 작업 순서: ① 바이블의 640×360 블록아웃으로 구도 확정 → ② 아래 프롬프트로 무드 시안 4~8장 → ③ 시안을 nearest-neighbor로 640×360까지 줄이고 v2 팔레트로 리페인트 → ④ 실제 HUD를 얹어 §부록 A 검수 게이트 통과.
- 모든 프롬프트 앞에 **공통 스타일 블록**을, 네거티브 칸에는 **공통 네거티브**를 붙입니다.
- 비율 표기는 Midjourney 문법 예시입니다. 다른 생성기는 같은 비율로 생성한 뒤 정수 배율로 줄이세요.

## COMMON · 공통 스타일 블록

- 용도: 모든 프롬프트 앞에 붙임
- 비율: —
- 한글 요약: 640×360 네이티브 픽셀아트, 정수 3배 표시, 안티앨리어싱·블러·블룸 없음, 저채도 차콜·슬레이트·석재, 우상단 차가운 단일 광원.

```prompt
authentic pixel art drawn at native 640x360 resolution and shown at exact 3x integer scale, hard-edged square pixels, no anti-aliasing, no blur, no bloom, limited palette of about 48 colours, low-saturation charcoal, slate blue and stone grey environment, single cold key light from the upper right, dark gothic architecture, 2D horizontal-scrolling arcade shoot 'em up, player on the left facing right, enemies entering from the right
```

```negative
concept art, painterly, digital painting, splash art, anime key visual, gacha, mobile game, character card, ornate gold frame, gold border, filigree, bloom, glow haze, lens flare, chromatic aberration, purple, violet, magenta, pink, red sky, red moon, blood moon, neon, smooth gradient, blurry, soft focus, anti-aliased edges, high-resolution detail, mixed pixel sizes, rotated pixels, 3D render, photorealistic, text, watermark, logo, large UI panels
```

## SCR-03 · Stage 1 일반 전투 화면 (최우선)

- 용도: 전투 화면 키 시안. 블록아웃 §5-3과 1:1 대응
- 비율: 16:9 (`--ar 16:9 --style raw --stylize 50`)
- 한글 요약: 부분 일식 아래 묘역과 성당 측면, 좌측 1/3의 세라핀이 오른쪽으로 금빛 탄을 쏘고, 오른쪽에서 해골 종지기·박쥐·촛대 망령이 진입. 화면에서 가장 밝은 것은 적탄. HUD는 하단 모서리에만 작게.

```prompt
In-game screenshot of Stage 1 of a 2D horizontal-scrolling gothic arcade shoot 'em up. Night under a partial solar eclipse: a small pale crescent sun high in the upper-right sky; dark slate-blue sky (#0A1018 to #2A3E58) with sparse single-pixel stars. Five parallax layers: a far city of spires as one flat dark slate silhouette against a faint horizon glow; a gothic cathedral flank in dark stone (#252022, #312B2C) with buttresses, pinnacles, string courses and unlit lancet windows, with ground mist dithered over its base; a ruined cloister arcade of pointed arches in near-black stone on the left; a 36-pixel ground band of cobbles and small tombstones lit on their top edges; thin black iron fence and bare branches as foreground silhouettes only at the top-left corner and the bottom edge. The player flies in the left third facing right: a small 48x32-pixel knight-nun in a white surcoat with a couched lance and an iron ring halo behind her head, firing thin double pale-gold light streaks (#D9AD52) to the right. Enemies enter from the right: hooded skeletal bell-ringers holding hand bells, a V formation of bat wraiths, a candle revenant with a cold pale flame; all in bone and grey tones, back-lit with a 1-pixel cold rim light, eyes as single crimson pixels. Enemy bullets are the brightest objects on screen: round bullets with a dark 1-pixel outline, a crimson ring (#C91C30, #FF4152) and a white core, in an aimed 5-way fan, plus a few white bullets with crimson rims. Tiny HUD at the screen edges only: small diamond HP pips and bell-shaped bomb icons at bottom-left, an 8-digit pixel-font score at bottom-right, no panels, no frames. Clear value hierarchy: darkest background, mid-value characters, brightest bullets. Reads as real gameplay, not promotional art.
```

```negative
(공통 네거티브) + glowing windows, orange lamps, red moon, enemies larger than a quarter of the screen height, text in the middle of the screen
```

## SCR-04 · Stage 1 보스전 화면 (최우선)

- 용도: 보스전 키 시안. 블록아웃 §5-4와 1:1 대응
- 비율: 16:9 (`--ar 16:9 --style raw --stylize 50`)
- 한글 요약: 개기일식(검은 원반·진주빛 코로나·작은 붉은 홍염), 화면 높이 절반 이하의 종 보스가 오른쪽 1/3, 왼쪽 2/3은 회피 공간. 상단에 3px 보스 바.

```prompt
In-game boss fight screenshot of a 2D horizontal-scrolling gothic arcade shoot 'em up. Total solar eclipse in the upper-right sky: a black disc with a thin pearl-white corona and two or three tiny crimson prominences on its rim; dark slate sky with a pale cold glow along the whole horizon. Background: a broken belfry tower as a dark slate silhouette with an empty pointed bell arch; ruined cloister arches at the left; rubble floor. The boss occupies the right third and is no taller than half the screen: 'Bellkeeper', a giant tarnished-bronze church bell that is its own body, a hooded skull with tiny crimson eyes sitting on the bell's crown, two long skeletal arms raising a bell hammer, and a crimson clapper core hanging under the bell mouth as the weak point; cold rim light on its right edges. The player is on the left facing right: a slim hunter with narrow grey moth wings marked with small blue eye-spots, firing thin blue needles. Bullet pattern: an expanding ring of crimson-rimmed white-core bullets released from the bell, three large white bullets with crimson rims drifting slowly, a line of crimson needle bullets aimed at the player along a faint dotted aim line. A thin 3-pixel boss health bar across the very top of the screen, the boss name in tiny pixel font at its left, two phase notches; tiny HUD in the bottom corners. The left two thirds of the screen stay open for dodging.
```

```negative
(공통 네거티브) + boss filling the screen, giant health bar, phase title text in the middle, red tinted screen, glowing purple bullets
```

## SCR-01 · 타이틀 화면

- 용도: 타이틀 키 시안 (§5-1)
- 비율: 16:9
- 한글 요약: 개기일식 아래 종루 난간에 선 세 인물의 작은 뒷모습, 거대한 건축과 작은 인물. 왼쪽은 로고 자리와 텍스트 메뉴만.

```prompt
Title screen of a gothic pixel-art arcade shooter. Night under a total solar eclipse: a black disc with thin pearl corona rays and tiny crimson prominences in the upper right; deep slate sky with many single-pixel stars and a pale horizon glow behind a distant city of gothic spires. Right foreground: the stone parapet of a bell tower with tall lancet openings showing the sky; on the ledge three tiny figures about 24 pixels tall seen from behind, looking at the eclipse: a knight with an upright lance and a ring halo, a hooded figure with folded moth wings, a veiled woman beside an upright coffin holding a small green lantern. Left side: an empty area reserved for the game logo, a short vertical text menu in a small pixel font (START, STORY, OPTIONS, ARCHIVE, CREDITS) with a tiny diamond cursor; no buttons, no frames. Calm, vast and silent: huge architecture, small people.
```

```negative
(공통 네거티브) + large character illustration, logo with gold gradient, glowing title, menu buttons
```

## SCR-02 · 캐릭터 선택 화면

- 용도: 선택 화면 키 시안 (§5-2)
- 비율: 16:9
- 한글 요약: 어두운 성당 회랑, 창으로 들어온 빛기둥 아래 받침대 위의 전신 픽셀아트(조각상처럼). 왼쪽은 실제 크기 스프라이트 목록, 오른쪽은 스탯 블록과 1:1 실시간 프리뷰.

```prompt
Character select screen of a gothic pixel-art arcade shooter. Interior of a dark cathedral nave: stone columns, three tall lancet windows letting in pale eclipse light, a dithered beam of light falling on a stone plinth at the center. On the plinth a full-body pixel-art figure about 96x144 pixels standing like a statue: a knight-nun in a white surcoat, steel pauldrons, a chainmail coif with a short veil, a tall lance held upright with a pale gold tip, an iron ring halo behind her head. Left column: three small in-game flight sprites at real size with their names in a small pixel font, the selected one bright and the others dim. Right column: the name, a short title in a Korean pixel font, four stat rows drawn as small square blocks in pale gold, three text tabs (BASIC, CHARGE, BOMB) and a small framed live gameplay preview window showing the character shooting at a bronze bell training dummy. Bottom: a key guide with tiny 1-pixel key caps. No carousel arrows, no card frames, no large illustration.
```

```negative
(공통 네거티브) + character cards, rotated illustration, selection arrows, gold card frames
```

## SCR-05 · 스테이지 클리어 화면

- 용도: 결과 화면 키 시안 (§5-5)
- 비율: 16:9
- 한글 요약: 일식이 끝나며 다이아몬드 링 섬광. 왼쪽에 실제 크기 캐릭터, 오른쪽 절반은 체커 디더로 어둡게 하고 결과 열만. S 랭크 한 글자만 금박.

```prompt
Stage clear results screen of a gothic pixel-art arcade shooter. The eclipse is ending: a bright diamond-ring flash on the edge of the black sun in the left part of the sky, the sky one step lighter than in the stage. The player character, a veiled witch sitting sideways on a floating black coffin with a green lantern, hovers at the left at in-game size. The right half of the screen is darkened with a 50% checkerboard dither, with no panel frame; on it a results column in a small pixel font: STAGE 1 CLEARED, a Korean subtitle, rows SCORE / ENEMIES / MAX CHAIN / GRAZE / DAMAGE / BOMBS / BOSS TIME with right-aligned numbers, a thin divider line, then RANK with a single pixel-art letter S in muted antique gold and a small NEW RECORD label; two text options at the bottom. Quiet and readable.
```

```negative
(공통 네거티브) + ornate result panel, rank stamp with wings, confetti, enlarged character art
```

## SCR-06 · 게임오버 화면

- 용도: 게임오버 키 시안 (§5-6)
- 비율: 16:9
- 한글 요약: 스테이지 화면 전체를 무채색으로 팔레트 스왑하고 체커 디더로 어둡게. 색은 일식의 작은 홍염뿐. 바닥에 떨어진 쇠고리.

```prompt
Game over screen of a gothic pixel-art arcade shooter. The whole stage frame is desaturated to neutral greys by a palette swap to a grey ramp and dimmed with a checkerboard dither; the eclipse in the sky keeps only its tiny crimson prominences as the single colour; a fallen iron ring halo lies on the ground. A small centered text block: GAME OVER in a bone-white pixel font, CONTINUE? with one large pixel digit 7, YES and NO options, one line of small Korean text below. No big red letters, no giant ring, no enlarged character.
```

```negative
(공통 네거티브) + big red title, giant red circle, character portrait in the center
```

## CHR-01 · 세라핀 캐릭터 시트

- 용도: 세라핀 전신·비행 스프라이트·이펙트·초상화 시안 (§4-1)
- 비율: 3:2 (`--ar 3:2`)
- 한글 요약: 천사가 아닌 사람 기사. 날개 없음. 흰 서코트·강철 판금·사슬 두건·쇠고리·창. 금색은 고리·창끝·탄에만.

```prompt
Pixel art character sheet on a flat dark slate background (#161920) for a 2D side-scrolling shoot 'em up, light from the upper right. Character: Seraphine, the last choir-knight of a fallen cathedral, a young woman, not an angel, no wings: a white surcoat over dark steel plate, a chainmail coif with a short white veil, an iron ring halo with gold-leaf inlay floating behind her head, a knight's lance with a pale gold tip. Row 1: full-body standing pose, 96x144 pixels, three-quarter view facing right, lance held upright. Row 2: in-game flight sprite 48x32 pixels facing right, body leaning 15 degrees forward, knees bent back, lance couched horizontally, surcoat tails and veil streaming behind; a 6-frame flight loop plus tilt-up, tilt-down and hit (head thrown back) frames. Row 3: effects at the same pixel scale: thin double gold light streaks (basic shot), a 44-pixel light lance (charge level 1), twin long lances with a small light cross at the muzzle (charge level 2), falling vertical light pillars (bomb). Row 4: a 64x64 bust portrait with three expressions. Palette: bone whites, cool steel greys, pale gold only on the halo, the lance tip and the shots. Clean selective outlines, one consistent pixel density for every element.
```

```negative
(공통 네거티브) + angel wings, feathers, long flowing anime hair, armor with gold everywhere
```

## CHR-02 · 녹티스 캐릭터 시트

- 용도: 녹티스 시안 (§4-2)
- 비율: 3:2
- 한글 요약: 일식의 마지막 빛을 쫓는 나방 사냥꾼. 좁고 긴 나방 날개(청색 안점), 더듬이 두건, 얼굴을 가린 목도리, 손목 석궁과 접이식 낫.

```prompt
Pixel art character sheet on a flat dark slate background (#161920) for a 2D side-scrolling shoot 'em up, light from the upper right. Character: Noctis, a moth hunter who chases the last light of the eclipse: slim and androgynous, long narrow moth wings in dark grey with small electric-blue eye-spots, a hood with two swept-back feathered antennae, a long scarf covering the lower face, a wrist crossbow and a folded scythe on the back, one glowing blue eye. Row 1: full-body 96x144 standing pose with the wings half folded like a cloak. Row 2: flight sprite 48x32, body nearly horizontal, wings swept back, scarf streaming straight back; a 4-frame fast wing flutter, a forward frame (wings folded thin), a back frame (wings spread) and a hit frame (wings crumpled). Row 3: a thin blue needle volley (basic), a zigzag lightning bolt (charge 1), a spinning crescent scythe boomerang (charge 2), three horizontal lightning bolts across a darkened screen (bomb). Row 4: 64x64 bust portraits. Palette: charcoal leather, slate grey wing membrane, electric azure (#3698D6, #82CEFA) only on the eye-spots, the eye and the shots.
```

```negative
(공통 네거티브) + black feathered wings, bat wings, vampire, red eyes, purple
```

## CHR-03 · 모르가나 캐릭터 시트

- 용도: 모르가나 시안 (§4-3)
- 비율: 3:2
- 한글 요약: 장례 행렬을 이끄는 장의 마녀. 고깔모자·빗자루 없음. 상복 베일, 공중에 뜬 검은 관에 옆으로 앉음, 지팡이 끝 철제 등롱의 묘지 녹색 혼령불. 얼굴은 아래에서 녹빛으로 조명.

```prompt
Pixel art character sheet on a flat dark slate background (#161920) for a 2D side-scrolling shoot 'em up. Character: Morgana, the funeral witch who leads processions of the dead; no pointed hat and no broom: a black lace mourning veil, a high-collared black dress, a pale face lit from below by green lantern light; she sits side-saddle at the back of a floating black wooden coffin bound with iron bands and hanging chains, holding a long staff with an iron cage lantern of grave-green spirit fire at its tip. Row 1: full-body 96x144 standing beside her upright coffin. Row 2: flight sprite 48x32: a long horizontal coffin with her seated at the rear and the lantern swinging at the front; a slow 6-frame hover loop, tilt frames and a hit frame (the coffin nose lifts). Row 3: three teardrop green wisps fanning out (basic), three homing wisps (charge 1), seven spirit orbs converging (charge 2), a procession of small ghost silhouettes marching across the screen (bomb). Row 4: 64x64 bust portraits lit only from below. Palette: black and charcoal cloth, dark stone-brown coffin wood, iron greys, grave green (#349E6E, #79DCA4) only on the lantern, the spirits and the shots.
```

```negative
(공통 네거티브) + witch hat, broom, magenta, pink hair, cute chibi
```

## CHR-04 · 실루엣 라인업

- 용도: 실루엣 구분 검증 (§4 공통)
- 비율: 3:1 (`--ar 3:1`)
- 한글 요약: 비행 스프라이트 3종을 검정 실루엣과 컬러로 나란히. 실루엣만으로 구분되어야 함.

```prompt
Three in-game flight sprites side by side at 48x32 pixels each, shown first as solid black silhouettes on a light grey background and then in colour below: a lance-and-ring knight (straight lines and a circle), a moth-winged hunter (back-swept crescents), a witch riding a coffin (a long horizontal box with a hanging lantern). Each must be identifiable from its silhouette alone. Pixel art at 4x integer scale, no anti-aliasing.
```

```negative
(공통 네거티브)
```

## BOS-01 · 보스 3페이즈 시트

- 용도: 벨키퍼 아바돈 디자인 시안 (§5-4)
- 비율: 3:1
- 한글 요약: 종이 곧 몸. 종의 머리 위 두건 해골, 어깨에서 나온 뼈 팔과 망치, 종 아래 크림슨 추(코어). P1 온전 → P2 균열 → P3 하반부 붕괴·갈비뼈 우리.

```prompt
Boss design sheet, pixel art, three phases side by side, each no larger than 160x176 pixels at native resolution, shown at 3x on a dark slate background, facing left: 'Bellkeeper Abaddon', a giant tarnished-bronze church bell that is its own body; a hooded skull sits on the bell's crown, two long skeletal arms come out of the bell's shoulders holding a bell hammer, and the bell's clapper is a crimson soul core hanging under the bell mouth. Phase 1: intact bell, cold pearl rim light. Phase 2: two glowing crimson cracks, a chipped rim, crimson rim light. Phase 3: the lower half of the bell shattered, exposing a cage of bone ribs that holds a larger crimson core. Bronze ramp (#33271E to #B7966C), bone (#877A67 to #D9CDB6); crimson only on the core, the cracks, the eyes and the rim light.
```

```negative
(공통 네거티브) + boss wider than the screen, separate bell and body, robes covering the bell, gold bell, purple
```

## ENM-01 · Stage 1 적 라인업

- 용도: 적 디자인 시안 (§5-3)
- 비율: 3:1
- 한글 요약: 모두 왼쪽을 향하고 역광 림 라이트, 뼈·재·석재·청동만 사용, 눈만 크림슨 1px. 죽을 때는 불꽃 폭발 대신 재로 흩어짐.

```prompt
Enemy lineup sheet for Stage 1, pixel art at native size shown at 3x, all facing left, back-lit by a cold rim light from the upper right, built only from bone, ash grey, stone and tarnished bronze, eyes as single crimson pixels: a wraith bat 22x14, a candle revenant 14x26 with a pale cold flame, a hooded skeletal bell-ringer 30x42 holding a hand bell, a scythe cleric 40x48 in a tattered grey robe, a grave sentinel knight 56x64 with a tower shield, a gravekeeper midboss 96x96 carrying a coffin on his back. For each: idle, attack telegraph (the eyes flash white for two frames) and death frames dissolving into grey ash clusters; no fire explosions.
```

```negative
(공통 네거티브) + fire explosions, purple robes, glowing aura
```

## ENV-01 · 패럴랙스 레이어 분해도

- 용도: 배경 5층 시안 (§3-6)
- 비율: 16:9
- 한글 요약: L0 하늘 디더 그라데이션·별·부분 일식 / L1 원경 첨탑 실루엣 / L2 성당 측면 / L3 무너진 회랑 / L4 바닥 36px / 전경(가장자리만).

```prompt
Parallax background breakdown for Stage 1, pixel art, five separated 640x360 layers shown stacked with gaps: L0 sky with dithered bands from #0A1018 to #2A3E58, single-pixel stars and a partial solar eclipse; L1 far spires as one flat dark slate silhouette; L2 a cathedral flank with buttresses, pinnacles, string courses and unlit lancet windows in dark stone, ground mist dithered over its base; L3 a ruined cloister arcade of pointed arches in near-black stone; L4 a 36-pixel ground band with cobbles and tombstones lit on their top edges; plus a foreground layer of black iron fence and bare branches limited to the screen edges. Atmospheric perspective: far layers flatter, near layers darker; no lit windows, no red.
```

```negative
(공통 네거티브) + lit windows, lamps, fog glow, red moon
```

## FX-01 · 탄·이펙트 시트

- 용도: 적탄 2계열·플레이어 탄·아이템 시안 (§3-5, §4)
- 비율: 3:2
- 한글 요약: 세 가지 배경 띠 위에서 대비 검증. 적탄은 크림슨/뼈 2계열, 외곽 1px 어둡게 + 흰 코어. 플레이어 탄은 금·청·녹. 글로우 없음.

```prompt
Bullet and effect sprite sheet, pixel art at native size shown at 4x, laid over three background strips (dark slate, dark stone, pale horizon) to test contrast: enemy bullets in two families: crimson (7x7, 11x11 and 17x17 round bullets with a dark 1-pixel outline, a crimson ring and a white core; 15x15 needle bullets in 16 pre-rotated directions) and bone (white bodies with a crimson ring); player shots for three characters in pale gold, electric azure and grave green; their charge shots; small items (a gem, a bone cross, a silver lantern heart, a bell); ash-cluster death puffs. No glow halos, no blur.
```

```negative
(공통 네거티브) + glowing orbs, soft halos, neon bullets
```

## UI-01 · UI 키트

- 용도: HUD·메뉴 요소 시안 (§3-8, §5)
- 비율: 3:2
- 한글 요약: 5×7 숫자 폰트, 한글 픽셀 폰트, 텍스트 메뉴와 금박 마름모 커서, HP·폭탄·파워 아이콘, 차지 게이지 4상태, 3px 보스 바. 패널·테두리·장식 없음.

```prompt
Pixel UI kit for a gothic arcade shooter at 640x360 native resolution shown at 3x: a 5x7 pixel font for numbers and labels, a Korean pixel font sample, a vertical text menu with a tiny antique-gold diamond cursor (selected item bone white, others grey, disabled darker), 9x9 diamond HP pips (full, empty, and the last one crimson), 7x8 bell bomb icons, three small power pips, an 8-digit score, a 16x2 charge gauge in four states, and a thin 3-pixel boss health bar with two notches, a damage trail and a hatched invulnerable state. No panels, no borders, no ornaments; thin 1-pixel lines and spacing only.
```

```negative
(공통 네거티브) + ornate frames, metallic buttons, skeuomorphic panels
```
