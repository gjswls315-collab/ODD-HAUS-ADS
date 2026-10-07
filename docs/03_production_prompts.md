# ODD HAUS — 영상 제작용 프롬프트

브리프 출력 항목 **9. 최종 영상 제작용 프롬프트**. 샷 ID와 길이는 [`spec/timeline.json`](../spec/timeline.json)과 같다.

## 사용법

각 샷 프롬프트는 아래 순서로 조립해서 쓴다.

```
[STYLE LOCK]  +  [CHARACTER LOCK: 샷에 나오는 캐릭터만]  +  [SCALE LOCK]  +  [SHOT PROMPT]  +  (negative: [NEGATIVE])
```

- 비율은 **2:1** 기준(16:9 생성 후 레터박스), 24fps.
- 이미지 레퍼런스가 들어가는 모델이라면 `reference/keyvisual_poster.webp`와 `reference/storyboard_board.webp`(헤더 라인업)를 **모든 샷에 캐릭터 레퍼런스로** 넣는다.
- 스케일이 깨지기 쉬운 샷(4A · 4B · 5A · 5C · 7A)은 먼저 **키프레임 이미지를 생성해 확정**한 뒤, Image-to-Video로 움직임만 준다.

---

## A. 공통 블록

### STYLE LOCK
```
Premium stylized 3D animated brand film, feature-animation craft with original character designs,
miniature-scale cinematography, shallow depth of field, cinematic lensing, subtle film grain, 2:1 framing.
Night interior of a vintage house called ODD HAUS: waxed hardwood floors, Persian rugs, vinyl records,
old books, vintage furniture, plants, framed photos. Warm tungsten practical lamps against cool blue
moonlight, deep moody shadows, rich tactile textures.
Tone: dark, hip, stylish, emotional — indie film / premium brand film. Not horror. Not a game trailer.
```

### CHARACTER LOCK
```
MR. ODD — a huge heavyset man (~2 m), curly dark hair, thick black mustache, bushy eyebrows, stern frown,
burgundy plaid flannel robe with a rope belt over a white collared shirt, always holding a white mug printed
with a small black house icon. Gruff but secretly caring; never villainous.

BULLY — an ~11-year-old human boy, messy blond hair, charcoal baseball cap worn BACKWARDS (always clearly
visible), black skull band tee, olive cargo shorts, chunky black-and-white sneakers, studded wristband,
red flying-V electric guitar with "Bully" scrawled on it, crooked mischievous grin.

BUDDY — a shaggy, fluffy terrier-mix dog, wiry grey-brown-cream coat, floppy ears, big dark round eyes,
realistic dog anatomy on four legs, white shirt collar with a round gold tag reading "BUDDY",
navy-and-gold diagonal-striped necktie. Moves and reacts like a real dog.

VIN — a small glossy black vinyl record with big white cartoon eyes, white gloves, black-and-white sneakers.
PICKER — a small red rounded-triangle guitar pick with a white cross emblem, angry slanted eyebrows,
white gloves, red sneakers.
A.A. — a small AA battery, yellow top and royal-blue bottom with a lightning bolt, black knit beanie,
white gloves, sneakers; its charge light glows red when scared, green when happy.
LOCKE — a small antique gold key with a face on its bow, brown cap, dark green jacket, white gloves, sneakers.
REX — a small bronze chess king with a gold crown, red royal cape with white ermine trim, a tiny scepter.
```

### SCALE LOCK
```
Strict scale. The five object characters (Vin, Picker, A.A., Locke, Rex) are tiny, 11–18 cm tall —
as tall as Bully's sneaker or Mr. ODD's mug. Buddy is a real dog, about 3.5x their height
(his front paw is as tall as they are). Bully is a human boy, about 10x their height
(Buddy's head reaches his knee). Mr. ODD is the largest, about 14x their height
(Bully's head reaches his chest). Never render the characters at the same size.
```

### NEGATIVE
```
horror, jump scare, gore, creepy, game trailer, HUD, UI, villain snarl, bared teeth,
all characters the same size, Bully shrunk to toy size, Bully without his cap,
Buddy standing on two legs, Buddy with human hands or a human face,
object characters with human bodies, extra limbs, distorted faces, garbled text, misspelled logo,
watermark, flat lighting, daytime, oversaturated cartoon, low detail
```

---

## B. 원샷 마스터 프롬프트 (50초 전체)

긴 영상을 한 번에 생성하는 모델, 또는 제작 에이전트에게 전체 맥락을 줄 때 쓴다.

```
A 50-second premium 3D animated brand film for "ODD HAUS". [STYLE LOCK] [CHARACTER LOCK] [SCALE LOCK]

Story — Nothing is useless. Everyone needs a home.
0–7s: Rainy night. A floor-level ultra-wide shot of a vast hardwood hall; far away, a thin line of warm
light leaks from a small door under the stairs. From a gap in the baseboard, five tiny misfits emerge —
Vin, Picker, A.A., Locke, Rex — and huddle as a giant silhouette passes a lit doorway.
7–15s: They hide between LPs and a book marked "MUSIC". A huge shadow sweeps the shelf with heavy
footsteps; A.A.'s charge light blinks red and Picker covers it. Relief.
15–22s: Buddy the shaggy dog appears, towering but gentle. A floorboard creaks upstairs; his ears perk and
he stops them with a paw, then guides them along the rug, his gold BUDDY tag glinting.
22–30s: THUD — a giant sneaker. Tilt up to Bully, backwards cap, red flying-V, crooked grin. He flips his cap
upside down, the friends climb in, and he strides toward the stairs, Buddy trotting beside him.
30–38s: Music cuts. Mr. ODD looms at the foot of the stairs, backlit, enormous. Extreme close-up of his stern
eyes and twitching mustache. He reaches out… past them, and flips a tiny switch at baseboard height.
Click. A small house-shaped door under the stairs glows. "Hmph." He sips his mug and turns away.
38–46s: Locke fits the keyhole exactly — the door opens in a sliver of gold. A hidden den: ODD HAUS sign,
lamp, plaid blankets, fairy lights, and hand-written name tags for every one of them. On the beat:
A.A. completes the fairy-light battery pack, Vin lands on a toy turntable and the beat drops,
Rex completes a chess set, Picker becomes Bully's first strum, Buddy flops on a cushion marked BUDDY.
46–50s: Everyone together in golden light; outside the doorway Mr. ODD pretends to read a newspaper,
the faintest smile under his mustache. The house-shaped doorway match-cuts into the logo.
End line: "Nothing is useless. Everyone needs a home." / "쓸모없는 것은 없다. 모두에게는 집이 필요하다."

Color arc: cool blue night (80% blue) gradually warming; the switch click at 36s turns the film fully amber.
Sound: rain, ticking clock, sneaky pizzicato → warm guitar → hip boom-bap riff → silence and heartbeat →
switch click → warm e-piano → lo-fi beat that starts when Vin lands on the turntable.
```

---

## C. 샷별 비디오 프롬프트 (22샷)

> 각 프롬프트 앞에 STYLE · CHARACTER(해당 캐릭터만) · SCALE LOCK을 붙이고, NEGATIVE를 함께 넣는다.

### S01 · A BIG HOUSE, SMALL MISFITS
**1A · 4.2s** · 캐릭터 없음
```
Fade in from black. Ultra-wide floor-level shot, the lens 2 cm above a vast waxed hardwood floor inside ODD HAUS
at night. The floorboards stretch away like a highway toward a distant staircase; under the stairs, one thin
line of warm amber light leaks around a small door. Cool blue moonlight through a rain-streaked window,
a wall clock ticking. Very slow push-in. Vast, quiet, beautiful.
```
**1B · 2.8s** · Vin, Picker, A.A., Locke, Rex, (Mr. ODD 실루엣)
```
Floor-level lateral tracking shot. From a gap in the baseboard five tiny characters emerge one by one:
VIN rolls out first, PICKER hops after him, A.A. tiptoes nervously, LOCKE glances back on lookout,
REX drags his long royal cape last. They huddle close, dwarfed by the enormous hall. In the background a giant
silhouette passes a lit doorway and its shadow sweeps across the floor — all five flinch. Rack focus from the
group to the shadow.
```

### S02 · HIDING IN PLAIN SIGHT
**2A · 3.6s** · Vin, Picker, A.A., Locke, Rex
```
50mm macro inside a vintage record shelf. The tiny friends slip between tall LP sleeves and a thick old book
with "MUSIC" on its spine. VIN wedges himself between the records, pretending to be one of them; REX straightens
his crown on top of the book. A narrow beam of warm lamp light through the shelf gap, cool shadows.
Playful suspense.
```
**2B · 3.0s**
```
Tight two-shot, same shelf. Heavy footsteps — the LPs tremble with each step (subtle camera shake).
A huge shadow slowly sweeps across the shelf from left to right, swallowing the friends in darkness.
A.A.'s charge light blinks red in panic; PICKER claps both gloved hands over it. Everyone holds their breath.
```
**2C · 1.4s**
```
The shadow passes and light returns. All five exhale; REX's crown tips off and he catches it just in time.
Gentle pull-out.
```

### S03 · A FAITHFUL GUIDE
**3A · 3.6s** · Buddy + 작은 친구들
```
Low-angle hero shot from the tiny friends' eye level: BUDDY, the shaggy terrier-mix dog, steps in, towering over
them — his front paw as tall as they are — big but gentle. A floorboard creaks upstairs: Buddy's ears perk up and
he lifts one front paw to stop the group. Warm lamp rim light on his wiry fur, cool blue shadows.
Subtle punch-in on the ear perk.
```
**3B · 3.4s**
```
Side tracking shot synced to Buddy's paws. BUDDY leads the tiny friends along the edge of a Persian rug,
steering them around a creaky floorboard; they walk inside his shadow. His round gold "BUDDY" tag glints and his
striped necktie sways. Camera tilts down to the tag. The light is getting warmer.
```

### S04 · A BIGGER FRIEND
**4A · 2.8s** · Bully, Buddy, 작은 친구들 — *키프레임 먼저 확정*
```
Floor-level 18mm: THUD — a giant black-and-white sneaker slams down right in front of the tiny friends
(camera shake, dust). They freeze; Buddy wags his tail. Slow tilt up the towering figure: olive cargo shorts,
a red flying-V guitar with "Bully" scrawled on it, a skull band tee, a studded wristband — up to BULLY's face,
a crooked mischievous grin under a charcoal baseball cap worn backwards. A human boy, ten times their height.
```
**4B · 2.6s** — *키프레임 먼저 확정*
```
Over-the-shoulder from the tiny friends' POV: BULLY crouches, pulls off his backwards cap, flips it upside down
on the floor like a little boat and nods — get in. VIN rolls in first, A.A. and LOCKE climb in, REX perches on
the brim like a throne; PICKER crosses his arms, hesitates, then dives in. Warm side light.
```
**4C · 2.6s**
```
Low wide tracking shot, short slow motion: BULLY strides toward the staircase carrying his upturned cap like a
basket, the tiny friends peeking over the rim, guitar slung on his back, BUDDY trotting at his side.
Cool, hip, confident. Warm rim light on his blond hair; the cap reads clearly against the background.
```

### S05 · A SCARY GIANT…?
**5A · 3.0s** · Mr. ODD, Bully, Buddy, 작은 친구들 — *키프레임 먼저 확정*
```
Silence. At the foot of the staircase a gigantic shadow falls over Bully, Buddy and the cap full of tiny friends.
Ultra-low 14mm tilt up: burgundy plaid robe, rope belt, a white mug with a black house icon, a thick black
mustache — MR. ODD, enormous, backlit by the hallway lamp, nearly a silhouette with a rim light.
Bully hides the cap behind his back with an awkward smile. Heavy and intimidating, but not evil.
```
**5B · 2.6s**
```
85mm extreme close-up, slow push: MR. ODD leans down. Bushy eyebrows, stern eyes with a single catchlight,
the tip of his thick mustache twitches. Cut-in detail: the tiny friends peek over the rim of the cap, trembling;
A.A.'s charge light blinks red. Cold bounce light from below, deep shadows. Breath-holding stillness.
```
**5C · 2.4s** — *키프레임 먼저 확정*
```
MR. ODD slowly reaches out — past the friends — and with one big finger flips a tiny brass switch set low on the
wall at baseboard height, clearly installed at THEIR height. Click. A warm amber glow outlines a small
house-shaped door under the stairs. He mutters "Hmph," sips from his mug and turns away, avoiding eye contact.
Warm light floods in from frame right — the film turns from blue to amber.
```

### S06 · A PLACE OF THEIR OWN
**6A · 2.2s** · Locke + 일행
```
Macro: LOCKE steps up to the small house-shaped door. Its keyhole is exactly his shape. He slots himself in and
turns — click. The door swings open and a vertical sliver of golden light widens to fill the frame, washing over
the friends' amazed faces.
```
**6B · 1.8s**
```
Reveal. 24mm crane up through a cozy hidden den under the stairs: a hand-painted wooden "ODD HAUS" sign,
a glowing fabric lamp, red plaid blankets, knit cushions, crates of records, strings of fairy lights — and
small spots each marked with a clumsy hand-written masking-tape name tag: VIN, PICKER, A.A., LOCKE, REX, BUDDY.
Someone prepared a place for every one of them.
```
**6C1 · 0.8s** `Close-up: A.A. clicks into the one empty slot of a fairy-light battery pack — the lights bloom on in warm bokeh and A.A.'s charge light turns green.`

**6C2 · 0.8s** `Close-up: VIN lands on a tiny toy turntable and starts to spin; his scratchy skip becomes the beat. Record grooves gleam in warm light.`

**6C3 · 0.8s** `Close-up: REX steps onto the empty king square of a chessboard, where a bottle cap had been standing in for the missing king — the set is complete; his cape settles.`

**6C4 · 0.8s** `Close-up: PICKER leaps between BULLY's fingers; Bully, backwards cap on, strikes the first chord on his red flying-V and grins.`

**6C5 · 0.8s** `Close-up: BUDDY flops onto a plaid cushion embroidered "BUDDY", lets out a happy sigh, tail thumping the floor.`

### S07 · TOGETHER. AT HOME.
**7A · 2.4s** · 전원 — *키프레임 먼저 확정*
```
Wide, golden light: everyone together in the den. BULLY strums on an amp seat, BUDDY rests his chin on Bully's
knee, the tiny friends sit in their labeled spots. Outside the house-shaped doorway MR. ODD sits on the stairs
pretending to read a newspaper, sipping from his mug — the faintest smile under his mustache. Slow dolly out
through the doorway, which becomes a frame within the frame. Keep negative space at top left for the end line.
```
**7B · 1.6s**
```
The house-shaped doorway match-cuts into the house icon inside the "A" of the ODD HAUS logo.
Clean end card: distressed cream "ODD HAUS" logo over dark, warm bokeh.
Line: "Nothing is useless. Everyone needs a home." / "쓸모없는 것은 없다. 모두에게는 집이 필요하다."
```

---

## D. 이미지 프롬프트

### D1. 메인 키 비주얼 (포스터 세로 4:5)
```
Cinematic 3D brand key visual for "ODD HAUS". [STYLE LOCK] [CHARACTER LOCK] [SCALE LOCK]
Low floor-level angle inside ODD HAUS at night. Upper right: MR. ODD on the staircase balcony, huge, stern,
holding his house-icon mug — but warm lamplight falls on him. Middle left: BULLY, backwards cap clearly visible,
red flying-V, crooked grin, leaning in. Center: BUDDY the shaggy dog, gold BUDDY tag and striped tie.
Foreground floor: the five tiny friends (VIN, PICKER, A.A., LOCKE, REX) side by side on the rug.
Right: the glowing hidden den under the stairs — wooden ODD HAUS sign, lamp, plaid blankets, fairy lights,
tiny hand-written name tags. A small house-shaped door stands ajar, golden light spilling out toward the group.
Text: "ODD HAUS" (distressed cream logo, house icon inside the A), "Nothing is useless. Everyone needs a home.",
"쓸모없는 것은 없다. 모두에게는 집이 필요하다."
Premium emotional brand film poster, not a horror or game poster.
```

### D2. 스토리보드 보드 (가로, 7패널)
```
Cinematic 3D storyboard board for a 50-second ODD HAUS brand film, dark premium presentation layout:
header with the ODD HAUS logo, "50-SECOND FILM CONCEPT", and a character lineup (tiny friends, Buddy, Bully,
Mr. ODD behind) at correct scale. Seven numbered panels, each with timecode, title, one-line EN/KR caption:
01 00:00–00:07 A BIG HOUSE, SMALL MISFITS — tiny friends emerge from the baseboard; far away, a warm line of light.
02 00:07–00:15 HIDING IN PLAIN SIGHT — hiding between LPs; a giant shadow sweeps the shelf; A.A. blinks red.
03 00:15–00:22 A FAITHFUL GUIDE — Buddy's ears perk; he stops them with a paw.
04 00:22–00:30 A BIGGER FRIEND — Bully's flipped backwards cap becomes a boat for the friends.
05 00:30–00:38 A SCARY GIANT…? — Mr. ODD reaches past them to a tiny switch at baseboard height. Click.
06 00:38–00:46 A PLACE OF THEIR OWN — Locke opens the house-shaped door; name tags for everyone.
07 00:46–00:50 TOGETHER. AT HOME. — golden den, Mr. ODD's tiny smile, end line.
[SCALE LOCK] Warm-amber versus cool-blue color story progressing panel to panel.
```

### D3. 캐릭터 스케일 라인업 시트
```
Character scale lineup sheet on a neutral warm-grey background with a height ruler in centimeters, front view,
all standing on one ground line, left to right: PICKER 11 cm, VIN 12 cm, A.A. 13 cm, LOCKE 14 cm, REX 18 cm,
BUDDY (dog, 48 cm to head), BULLY (human boy, 142 cm, backwards cap), MR. ODD (198 cm, holding his mug).
[CHARACTER LOCK] Clean turnaround-sheet lighting, labels under each character.
```

### D4. 엔드 카드
```
End card for ODD HAUS: a distressed cream "ODD HAUS" logo with a small house icon inside the "A", centered over
deep warm bokeh of a cozy den (lamp and fairy lights out of focus). Below in small hand-lettered caps:
"NOTHING IS USELESS. EVERYONE NEEDS A HOME." and in Korean "쓸모없는 것은 없다. 모두에게는 집이 필요하다."
Minimal, premium, 2:1 letterboxed.
```

---

## E. Claude Code로 이어서 작업할 때 (예시 지시문)

이 저장소에서 아래처럼 지시하면 스펙 수정부터 재렌더까지 한 번에 진행된다.

```
spec/timeline.json의 5C에 Mr. ODD 옵션 대사 "흠. …늦었군."을 36.8–38.0s 하단 자막 슈퍼로 추가하고,
애니매틱 클린/리뷰 컷을 다시 렌더해줘.
```
```
15초 컷다운을 spec/timeline_15s.json으로 만들어줘. 1A·2B·4A·5C·6A·6B·7A·7B 샷으로 구성하고,
카피와 로고 타이밍을 15초에 맞춰 재배치한 뒤 renders/에 렌더해줘.
```
```
9:16 세로 버전을 만들어줘. meta.resolution을 1080x1920으로, active_aspect를 0.5625로 바꾸고,
각 샷의 cam 키프레임을 세로 구도로 다시 잡아(키 비주얼 포스터를 우선 사용) 렌더해줘.
```
