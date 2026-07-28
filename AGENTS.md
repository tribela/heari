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

`page.tsx`는 618→169줄로 정리된 상태. 이 이상 불어나면 추가 분할.

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

## Hook Extraction Rule

**한 컴포넌트가 300줄 이상의 상태/로직을 포함하면 → 커스텀 hook으로 분할.**

### 분할 기준

| 신호 | 행동 |
|------|------|
| 5개 이상의 `useState` | 도메인별 hook으로 그룹핑 |
| 3개 이상의 `useEffect` | hook으로 분리 (책임 단위) |
| `useCallback`이 200줄 이상 | hook으로 이동 |
| localStorage 직접读写 | `use{Feature}`로 캡슐화 |
| 같은 상태 묶음이 3+ 함수에서 사용 | Domain hook 추출 |

### Hook 파일 위치

`src/lib/hooks/use-{feature}.ts`

### Hook 설계 원칙

```tsx
// GOOD: hook이 상태 + 액션을 모두 소유, 컴포넌트는 조립만
export function useGame() {
  const [attempts, setAttempts] = useState(0);
  // ... effects, callbacks ...
  return { attempts, submitGuess, ... };
}

// BAD: hook이 컴포넌트를 반환 (hook ≠ component)
export function useGame() {
  return <GameBoard />;  // ✗
}

// BAD: hook 내부에서 UI를 암시
export function useGame() {
  return <div>...</div>;  // ✗ (이건 컴포넌트)
}
```

### hook return 값 설계

- **flat하게**: 필요한 값만 개별 반환 (중첩 객체 금지)
- **상태 접두사**: 불필요 (`attempts` → O, `state.attempts` → ✗)
- **setter**: 상태 변경이 단순하면 `set{Name}` 노출, 복잡하면 action 함수만 노출
- **ref**: DOM ref는 hook에서 생성하여 반환 (`inputRef`)

### 현재 hook 구조

| Hook | 파일 | 역할 | 크기 |
|------|------|------|------|
| `useGame` | `src/lib/hooks/use-game.ts` | 게임 데이터 fetch, 상태, 영속화, 추측/힌트/자모 로직 | 310줄 |
<!-- END:refactoring-guidelines -->
