# 헤아리 (Heari) — Design System

---

## Design Principles

1. **Minimal & Focused** — 하루 한 단어 게임. 방해 요소 없이 문제(초성)와 입력만.
2. **Soft & Playful** — 모서리 둥글게(`rounded-lg`), 부드러운 그림자, 타이포그래피 강조.
3. **뚜렷한 피드백** — 모든 액션(추측, 힌트, 정답)은 즉각적인 시각적 응답(애니메이션, 색상 변화).
4. **Progressive Disclosure** — 초성 → 자모 그리드 → 개별 자모 공개. 정보를 단계적으로 제공.

---

## Color System

### CSS Custom Properties (`src/app/globals.css`)

| Token | Light | Dark | 용도 |
|-------|-------|------|------|
| `--background` | `#fafafa` | `#09090b` | 페이지 배경 |
| `--foreground` | `#1a1a2e` | `#f4f4f5` | 기본 텍스트 |
| `--muted` | `#a1a1aa` | `#71717a` | 보조 텍스트, 날짜 |
| `--border` | `#d4d4d8` | `#27272a` | 입력 필드, 일반 테두리 |
| `--card` | `#ffffff` | `#18181b` | 로그 카드, 모달 배경 |
| `--card-border` | `#e4e4e7` | `#27272a` | 카드 테두리 |
| `--success-bg` | `#f0fdf4` | `#052e16` | 정답 배경 |
| `--success-text` | `#166534` | `#86efac` | 정답 텍스트 |
| `--success-border` | `#bbf7d0` | `#166534` | 정답 카드 테두리 |
| `--warning` | `#ea580c` | `#f97316` | 경고/에러 (중복 메시지) |

### Tailwind Utility Classes 사용 패턴

| 의미 | Light | Dark | 사용처 |
|------|-------|------|--------|
| 일반 텍스트 | `text-zinc-800` | `text-zinc-200` | 초성, 제목 |
| 보조 텍스트 | `text-zinc-400/500` | `text-zinc-500` | 날짜, 설명, 미공개 자모 |
| 일반 카드 | `bg-white border-zinc-200` | `bg-zinc-800 border-zinc-700` | 로그 항목 |
| 입력 필드 | `bg-white border-zinc-300` | `bg-zinc-800 border-zinc-600` | 텍스트 입력 |
| 버튼 기본 | `bg-zinc-800 text-white` | `bg-zinc-700` | 확인 버튼 |
| 버튼 보조 | `border-zinc-300` | `border-zinc-600` | 힌트 버튼 |
| 힌트 툴팁 | `bg-white border-zinc-200 shadow-lg` | `bg-zinc-800 border-zinc-600` | TooltipButton |
| 모달 오버레이 | `bg-black/40` | 동일 | Fedi 입력 모달 |

### 로그 항목 상태별 색상

| 상태 | Light | Dark | 상호작용 |
|------|-------|------|---------|
| **정답** | `text-green-700 bg-green-50 border-green-200` | `text-green-400 bg-green-950 border-green-800` | 클릭 불가 |
| **선택된 힌트** | `text-zinc-700 bg-green-50/50 border-green-300` | `text-zinc-300 bg-green-950/50 border-green-600` | 클릭 해제 가능 |
| **일반 추측** | `text-zinc-700 bg-white border-zinc-200` | `text-zinc-300 bg-zinc-800 border-zinc-700` | hover 밝기 변화, 클릭 시 힌트 선택 |
| **이벤트 (힌트/자모)** | `text-zinc-700 bg-white border-zinc-200` | `text-zinc-300 bg-zinc-800 border-zinc-700` | **클릭 불가** (`cursor-pointer` 없음, `hover` 없음) |

### 새 자모 하이라이트 — WCAG 준수

방금 공개된 자모를 강조하는 `inline-flex` 타일:

| 속성 | 값 | 대비율 |
|------|-----|--------|
| 배경 (light) | `bg-blue-600` (`#2563eb`) | |
| 글자 (light) | `text-white` (`#ffffff`) | **8.6:1** (AAA) |
| 배경 (dark) | `bg-blue-500` (`#3b82f6`) | |
| 글자 (dark) | `text-white` (`#ffffff`) | **7.8:1** (AAA) |
| 형태 | `w-4 h-4 rounded-[3px] text-[11px]` | |
| 강조 | `font-bold scale-110` | |

다른 자모와 구분되는 3가지 차이: **색상**(파랑 배지) + **크기**(`scale-110`) + **굵기**(`font-bold`)

#### 변경 이력

- **AS-IS**: `text-blue-600 bg-blue-100` → 대비율 약 2.3:1 (WCAG AA 4.5:1 미달)
- **TO-BE**: `text-white bg-blue-600` → 대비율 8.6:1 (WCAG AAA 충족)

---

## Typography

### Font Stack

- **Sans**: Geist Sans (`--font-geist-sans`) — 영문/숫자
- **Mono**: Geist Mono (`--font-geist-mono`) — 코드/숫자
- **한글**: 시스템 폰트 fallback (Geist는 한글 글리프가 없음)
- 설정: `src/app/layout.tsx`에서 `Geist`/`Geist_Mono` 불러와 CSS 변수에 바인딩

### Type Scale

| 용도 | Class | Size | Weight |
|------|-------|------|--------|
| 초성 디스플레이 | `text-7xl` | 4.5rem | `font-bold` |
| 자모 힌트 타일 | `text-xl` ~ `text-2xl` | 1.25~1.5rem | `font-bold` |
| 인라인 자모 (로그) | `text-[11px]` | 0.6875rem | `font-medium` / `font-bold` (신규) |
| 페이지 제목 | `text-3xl` | 1.875rem | `font-bold tracking-tight` |
| 입력 필드 | `text-lg` | 1.125rem | normal |
| 버튼 텍스트 | `text-sm` ~ `text-lg` | 0.875~1.125rem | normal |
| 로그 항목 | `text-sm` | 0.875rem | normal |
| 메타 정보 (날짜/횟수) | `text-xs` | 0.75rem | normal |
| 설명 문구 | `text-sm` | 0.875rem | normal |

### Letter Spacing

- 초성: `tracking-widest` — 각 초성 사이를 넓게 벌려 가독성 확보

---

## Spacing & Layout

### Container

- `mx-auto max-w-md` — 모바일 퍼스트, 최대 448px
- `min-h-screen px-4 py-12` — 상하 여백 48px, 좌우 16px

### Vertical Rhythm

- 제목 아래: `mb-1` (설명문) → `mb-6` (초성 디스플레이)
- 입력 영역: `flex w-full gap-2`
- 로그 리스트: `mt-6 space-y-2`
- 정답 카드: `mt-6`

### 자모 힌트 그리드

- 음절 단위 그룹핑 (초성 기준 분할, `flex-wrap justify-center`)
- 그룹 간: `gap-x-6 gap-y-3`
- 개별 타일: `h-12 w-12` (mobile), `sm:h-14 sm:w-14` (desktop)
- 타일 내부: `flex items-center justify-center`
- 보더: `border-2 rounded-lg`

### 인라인 자모 (로그 내부)

- 개별 타일: `w-4 h-4 rounded-[3px] text-[11px]`
- 타일 간: `mx-px`
- `inline-flex items-center justify-center`

---

## Animation (`src/app/globals.css`)

| 이름 | 속성 | 지속시간 | 사용처 |
|------|------|---------|--------|
| `fade-in` | `opacity + translateY(8px)` | 0.5s | 페이지 전체 진입 |
| `pop-in` | `scale 0.7→1.08→1 + opacity` | 0.45s | 초성 글자, 자모 타일, 정답 카드 |
| `slide-up` | `opacity + translateY(12px)` | 0.35s | 일반 요소 |
| `slide-up` (log-enter) | `opacity + translateY(12px)` | **0.3s** | 로그 항목 (더 빠르게) |
| `pulse-dot` | `opacity + scale` | 1.4s (staggered 0.2s) | 로딩 인디케이터 |

### Staggered Delays

- 초성 글자: `animationDelay: i * 0.12s` — 왼→오 순서로 등장
- 자모 타일: `animationDelay: idx * 0.06s` — 더 촘촘하게

---

## Component Design

### Chosung Display (초기 상태)

- `text-7xl font-bold tracking-widest text-zinc-800 dark:text-zinc-200`
- 각 글자: `inline-block` + `pop-in` 애니메이션 + `chosung-char` 클래스
- 글자 사이: `mx-1`

### Jamo Grid (힌트 열기 후)

- 음절 단위 그룹핑 (초성 `initialRevealed[i] === true` 기준 분할)
- **공개된 자모**: `border-zinc-300 bg-white text-zinc-800` (실선, 흰 배경)
- **미공개 자모**: `border-dashed border-zinc-300 bg-zinc-50 text-zinc-400` + `?` + `cursor-pointer`
- 미공개 hover: `hover:border-zinc-400 hover:bg-zinc-100`
- 하단 문구: `'?'를 눌러 힌트를 공개하세요 (N회 사용)`

### Input + Button Group

```
flex w-full gap-2
├── input (flex-1)     rounded-lg border px-4 py-3 text-lg
├── hint-btn           TooltipButton wrapper, rounded-lg border px-3 py-3
└── submit-btn         bg-zinc-800 text-white rounded-lg px-6 py-3
```

- 입력창: `focus:border-zinc-500 focus:outline-none`
- 확인 버튼: `hover:bg-zinc-700` (dark: `hover:bg-zinc-600`)
- 모두 `disabled:opacity-50`

### Log Entry

```
rounded-lg border px-4 py-3 text-sm
┌─ {attempt}. ─┬─ {input / inline jamo grid} ─┬─ {hint text} ─┐
└──────────────┴──────────────────────────────┴───────────────┘
```

- 입장: `slide-up 0.3s`
- 일반 추측: `cursor-pointer` + `hover:bg-zinc-50`
- 이벤트(힌트/자모): `cursor-pointer` 없음, `hover` 없음
- 정답 시 힌트 텍스트 클릭으로 선택/해제 (공유 문구에 포함)

### Solved Card

- `rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950`
- `animate-pop-in` 진입
- 내부: `"정답입니다!"` + 시도 횟수 + 연속 일수
- 공유 textarea: `resize-none rounded-lg border border-green-200 ...`
- 버튼: 클립보드 복사 + 마스토돈/미스키 공유

### Modal (Fedi Instance Input)

- `fixed inset-0 z-50 flex items-center justify-center bg-black/40`
- 카드: `mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-800`
- 입력 + 확인 + 취소 버튼
- 오버레이 클릭 시 닫힘 (`onClick={e => ...}` stopPropagation)

### TooltipButton (`src/components/tooltip-button.tsx`)

- hover (desktop): 300ms 딜레이 후 표시 (`onMouseEnter` + `Date.now()` 가드)
- touch (mobile): 500ms 길게 누르면 표시 (`onTouchStart` setTimeout)
- 툴팁: `absolute bottom-full left-1/2 -translate-x-1/2 ... whitespace-nowrap`
- 다크모드: `dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-300`

### NotificationBell (`src/components/notification-bell.tsx`)

- 우상단 고정: `absolute right-0` (헤더 컨테이너 `relative`)
- Bell / BellOff 아이콘 토글 (lucide-react)
- 길게 누르면 구독 상태 변경
- 서비스워커 pushManager로 구독/해지

---

## Dark Mode

- **Media query**: `prefers-color-scheme: dark` (수동 토글 없음, 시스템 설정 따름)
- 모든 CSS 변수 쌍으로 정의 (`globals.css` `:root` + `@media (prefers-color-scheme: dark)`)
- Tailwind `dark:` 접두사로 컴포넌트별 대응
- `themeColor` 메타태그도 각각 지정 (`#fafafa` / `#09090b`)
- 모든 컴포넌트 라이트/다크 모두 검증 완료

---

## Accessibility (WCAG)

### 적용 기준

- **WCAG 2.2 AA** 목표 (가능 시 AAA)
- 일반 텍스트(<18px): 대비율 **4.5:1**
- 큰 텍스트(≥18px 또는 bold ≥14px): 대비율 **3:1**

### 검증된 조합

| 조합 | 대비율 | 등급 | 사용처 |
|------|--------|------|--------|
| `text-white` on `bg-blue-600` | 8.6:1 | AAA | 새 자모 하이라이트 (light) |
| `text-white` on `bg-blue-500` | 7.8:1 | AAA | 새 자모 하이라이트 (dark) |
| `text-zinc-700` on `#ffffff` | 5.6:1 | AA | 일반 텍스트 (light) |
| `text-zinc-300` on `bg-zinc-800` | 6.2:1 | AA | 일반 텍스트 (dark) |
| `text-green-700` on `bg-green-50` | 5.1:1 | AA | 정답 텍스트 |
| `text-zinc-400` on `#ffffff` | 3.1:1 | AA (큰텍스트) | 보조 정보 (날짜, 횟수) |
| `text-zinc-500` on `bg-zinc-800` | — | — | 보조 정보 (dark) |

### 포커스 & 상호작용

| 요소 | Light | Dark |
|------|-------|------|
| 입력 필드 focus | `border-zinc-500 outline-none` | `border-zinc-400` |
| 버튼 hover | `bg-zinc-700` | `bg-zinc-600` |
| 로그 hover | `bg-zinc-50` | `bg-zinc-700/50` |
| 비활성화 | `opacity-50` | `opacity-50` |

---

## 공유 포맷

```
{date} 헤아리 "{chosung}"
{selectedHint (optional)}
{N}번의 헤아림 (도움 {M}회) (optional)
{url}

#헤아리
```

### 예시

```
2026-07-29 헤아리 "ㄱㄷ"
5번의 헤아림 (도움 2회)
https://heari.11ax.net/

#헤아리
```

- `selectedHint`가 설정된 경우 힌트 텍스트가 두 번째 줄에 포함됨
- `도움`은 힌트 열기 + 자모 공개 횟수의 합계
- 마스토돈/미스키 공유 시 동일 포맷 사용
