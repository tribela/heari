<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:refactoring-guidelines -->
# Refactoring & Code Organization

This project values small, focused files over large monolithic ones. When adding features or cleaning up, follow these rules.

## File Size Budget

| 파일 유형 | 한계 | 초과 시 |
|-----------|------|---------|
| UI 컴포넌트 (`src/components/`) | **200줄** | 로직/렌더 분할 |
| 페이지 (`src/app/`) | **500줄** | 하위 컴포넌트 추출 |
| 라이브러리 (`src/lib/`) | **300줄** | 모듈 분할 |

`page.tsx`는 이미 618→454줄로 정리된 상태. 이 이상 불어나면 추가 분할.

## Component Extraction Rule

**한 컴포넌트가 3개 이상의 독립적인 시각적 영역을 렌더하면 → 각각 분할.**

### 추출 기준 (`page.tsx` 예시)

`page.tsx`의 render가 아래를 포함한다면 분할 대상:

```
<div>  ← 게임 보드 (chosung / jamo grid)
<div>  ← 입력 영역 (input + hint button + submit)  
<div>  ← 로그 목록
<div>  ← 정답 카드
<div>  ← 모달
```

→ 각각 `src/components/` 아래 별도 파일로 추출.

### Props 인터페이스 설계

```tsx
// GOOD: 명시적 props, 한 가지 책임
type Props = {
  logs: LogEntry[];
  solved: boolean;
  selectedHint: string | null;
  onToggleHint: (index: number) => void;
};

// BAD: 전체 상태 덩어리를 통째로 props
type Props = {
  gameState: typeof entireState;  // ✗
};
```

- props는 **flat**하게 (중첩 객체 X, 필요한 값만 개별 prop)
- 콜백은 `on{Action}` 네이밍
- boolean prop은 접두사 `is`/`has` (예: `isActive`, `hasHint`)

## Type Location Rule

| 타입 범위 | 위치 |
|-----------|------|
| 전역에서 사용 | `src/lib/game-types.ts` |
| 단일 컴포넌트 전용 | 해당 파일 상단 |
| API route 전용 | 해당 route 파일 |

`GameData`, `GuessResult`, `LogEntry` 등 앱 전역 타입은 이미 `game-types.ts`에 있음. 새 타입은 위 규칙에 따라 배치.

## Colocation Rule

- 컴포넌트와 그 스타일/상수는 **같은 파일**에 (`constants.ts` 분리 금지)
- 컴포넌트당 1파일. 여러 컴포넌트를 1파일에 넣지 않음
- `components/`는 flat 구조 (디렉터리 중첩 금지)

## Client Component Boundary

- `'use client'`는 **이벤트 핸들러나 hook이 필요한 가장 가까운 부모**에만
- 순수 렌더링 컴포넌트는 `'use client'` 없이 서버 컴포넌트로 남길 수 있음
- 단, 현재 모든 UI 컴포넌트는 `'use client'` (Next.js 16 호환성)
<!-- END:refactoring-guidelines -->
