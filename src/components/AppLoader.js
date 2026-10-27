/**
 * Loading states.
 *
 * Every skeleton mirrors the real layout it stands in for (same grid, heights,
 * paddings), so content swaps in without layout shift. Design rules:
 * - Surfaces (cards, columns, panels) stay solid; only the bones pulse, using
 *   opacity (compositor-only, no repaints) on one shared timeline so they move
 *   in sync. App chrome (sidebar, top bar) never animates.
 * - Content regions fade in after a short delay, so fast loads never flash.
 * - Each container is a `role="status"` region with an accessible label; the
 *   bones themselves are empty and silent to assistive tech.
 */
import React from 'react';
import styled, { css, keyframes } from 'styled-components';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const appear = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

// Content regions: invisible for 150ms, then fade in (skips flashes on fast loads).
const motion = css`
  animation: ${appear} 0.2s ease 0.15s both;
`;

const status = (label) => ({ role: 'status', 'aria-busy': true, 'aria-label': label });

/* ------------------------------------------------------------- primitives */

const Bone = styled.span`
  display: block;
  flex-shrink: 0;
  width: ${(p) => p.$w || '100%'};
  height: ${(p) => p.$h || '10px'};
  border-radius: ${(p) => p.$r || '4px'};
  background: ${(p) => (p.$dark ? 'rgba(255, 255, 255, 0.08)' : 'var(--wp-skeleton)')};
  animation: ${pulse} 1.6s ease-in-out infinite;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${(p) => p.$gap || '8px'};
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.$gap || '6px'};
  min-width: 0;
  flex: ${(p) => (p.$grow ? 1 : 'initial')};
`;

// Deterministic widths so skeletons look natural but never jitter between renders.
const TITLE_WIDTHS = ['82%', '64%', '91%', '55%', '73%', '68%', '87%', '60%'];
const pick = (list, i) => list[i % list.length];

/* ------------------------------------------------------------- task board */

const ToolbarShape = styled.div`
  ${motion}
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-height: 32px;
  flex-shrink: 0;

  .spacer {
    flex: 1;
  }

  @media (max-width: 768px) {
    .wide {
      display: none;
    }
  }
`;

function BoardToolbarSkeleton() {
  return (
    <ToolbarShape {...status('Loading projects')}>
      <Bone $w="240px" $h="32px" $r="6px" />
      <Bone $w="112px" $h="32px" $r="6px" />
      <Bone className="wide" $w="240px" $h="32px" $r="6px" />
      <Bone className="wide" $w="300px" $h="32px" $r="6px" />
      <span className="spacer" />
      <Bone className="wide" $w="110px" $h="12px" />
      <Bone $w="66px" $h="32px" $r="6px" />
    </ToolbarShape>
  );
}

const Board = styled.div`
  ${motion}
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
  overflow: hidden;
`;

const Column = styled.div`
  flex: 1 0 280px;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  background: var(--wp-surface-2);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
  overflow: hidden;

  > .col-head {
    height: 40px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid var(--wp-border);
  }

  > .col-cards {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  @media (max-width: 768px) {
    flex: 0 0 86vw;
  }
`;

const Card = styled.div`
  background: var(--wp-surface);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

// Per column: one entry per card, true when that card shows a preview line.
const COLUMN_SHAPES = [
  [true, false, true, false],
  [false, true, false],
  [true, false],
  [false, true, true],
];

export function BoardSkeleton({ columns = 3 }) {
  return (
    <Board {...status('Loading board')}>
      {Array.from({ length: columns }, (_, c) => (
        <Column key={c}>
          <div className="col-head">
            <Bone $w="8px" $h="8px" $r="50%" />
            <Bone $w={pick(['84px', '96px', '72px'], c)} $h="11px" />
            <span style={{ flex: 1 }} />
            <Bone $w="24px" $h="20px" $r="10px" />
          </div>
          <div className="col-cards">
            {COLUMN_SHAPES[c % COLUMN_SHAPES.length].map((withPreview, i) => {
              const n = c * 4 + i;
              return (
                <Card key={i}>
                  <Bone $h="12px" $w={pick(TITLE_WIDTHS, n)} />
                  {withPreview && <Bone $h="9px" $w={pick(TITLE_WIDTHS, n + 3)} />}
                  <Row>
                    <Bone $w="58px" $h="20px" />
                    {n % 2 === 0 && <Bone $w="70px" $h="20px" />}
                    <span style={{ flex: 1 }} />
                    <Bone $w="22px" $h="22px" $r="50%" />
                  </Row>
                </Card>
              );
            })}
          </div>
        </Column>
      ))}
    </Board>
  );
}

/* ------------------------------------------------------------------ table */

const TableShell = styled.div`
  ${motion}
  flex: ${(p) => (p.$fill ? 1 : 'initial')};
  min-height: 0;
  overflow: hidden;
  ${(p) =>
    p.$bare
      ? ''
      : `
    background: var(--wp-surface);
    border: 1px solid var(--wp-border);
    border-radius: var(--wp-radius-lg);
  `}
`;

const TableLine = styled.div`
  display: grid;
  grid-template-columns: ${(p) => p.$columns};
  gap: ${(p) => p.$gap || '12px'};
  align-items: center;
  padding: ${(p) => p.$pad || '0 14px'};

  &.sk-head {
    height: 34px;
    background: var(--wp-surface-2);
    border-bottom: 1px solid var(--wp-border);
  }

  &.sk-row {
    min-height: ${(p) => p.$rowHeight};
    border-bottom: 1px solid var(--wp-border-subtle);

    &:last-child {
      border-bottom: none;
    }
  }

  > * {
    min-width: 0;
  }

  .num {
    margin-left: auto;
  }

  .end {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  }
`;

function TableCell({ kind, r, c }) {
  switch (kind) {
    case 'title':
      return (
        <Stack $gap="6px">
          <Bone $h="11px" $w={pick(TITLE_WIDTHS, r + c)} />
          <Bone $h="9px" $w={pick(['48%', '62%', '40%', '55%'], r)} />
        </Stack>
      );
    case 'swatch':
      return (
        <Row $gap="10px">
          <Bone $w="28px" $h="28px" $r="6px" />
          <Stack $gap="6px" $grow>
            <Bone $h="11px" $w={pick(['58%', '72%', '46%', '64%'], r)} />
            <Bone $h="9px" $w={pick(['80%', '66%', '74%'], r)} />
          </Stack>
        </Row>
      );
    case 'tag':
      return <Bone $w={pick(['72px', '88px', '64px'], r + c)} $h="20px" />;
    case 'num':
      return <Bone className="num" $w="22px" $h="11px" />;
    case 'avatars':
      return (
        <Row $gap="0">
          <Bone $w="22px" $h="22px" $r="50%" />
          {r % 2 === 0 && <Bone $w="22px" $h="22px" $r="50%" style={{ marginLeft: -6 }} />}
        </Row>
      );
    case 'progress':
      return (
        <Row>
          <Bone $h="6px" $r="3px" style={{ flex: 1 }} />
          <Bone $w="28px" $h="10px" />
        </Row>
      );
    case 'actions':
      return (
        <div className="end">
          <Bone $w="26px" $h="26px" />
          <Bone $w="26px" $h="26px" />
        </div>
      );
    default:
      return <Bone $h="11px" $w={pick(['70%', '55%', '82%', '48%'], r + c)} />;
  }
}

/**
 * Table skeleton using the real table's grid template.
 * `cells` lists each column's shape: 'title' (two lines), 'swatch' (icon + two
 * lines), 'tag', 'text', 'num', 'avatars', 'progress' or 'actions'.
 * `bare` renders body rows only, for tables whose real header stays on screen;
 * `rowPadding`/`gap` then match that table's row spacing.
 */
export function TableSkeleton({
  columns,
  cells,
  rows = 8,
  rowHeight = '48px',
  label = 'Loading table',
  fill = false,
  bare = false,
  rowPadding,
  gap,
}) {
  return (
    <TableShell {...status(label)} $fill={fill} $bare={bare}>
      {!bare && (
        <TableLine className="sk-head" $columns={columns}>
          {cells.map((kind, c) =>
            kind === 'actions' ? (
              <span key={c} />
            ) : (
              <Bone key={c} className={kind === 'num' ? 'num' : undefined} $w={kind === 'num' ? '36px' : '64px'} $h="9px" />
            )
          )}
        </TableLine>
      )}
      {Array.from({ length: rows }, (_, r) => (
        <TableLine key={r} className="sk-row" $columns={columns} $rowHeight={rowHeight} $pad={rowPadding} $gap={gap}>
          {cells.map((kind, c) => (
            <TableCell key={c} kind={kind} r={r} c={c} />
          ))}
        </TableLine>
      ))}
    </TableShell>
  );
}

/* -------------------------------------------------------------- KPI strip */

const KpiGrid = styled.div`
  ${motion}
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(${(p) => p.$min}, 1fr));
  gap: 12px;
  margin-bottom: 16px;
`;

const KpiCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--wp-surface);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
`;

/** Matches the stat cards on Admin (icon + value + label) and Settings. */
export function KpiStripSkeleton({ count = 4, min = '180px', iconSize = '36px' }) {
  return (
    <KpiGrid {...status('Loading summary')} $min={min}>
      {Array.from({ length: count }, (_, i) => (
        <KpiCard key={i}>
          <Bone $w={iconSize} $h={iconSize} $r="6px" />
          <Stack $gap="8px">
            <Bone $w="44px" $h="18px" />
            <Bone $w={pick(['72px', '60px', '84px'], i)} $h="9px" />
          </Stack>
        </KpiCard>
      ))}
    </KpiGrid>
  );
}

/* -------------------------------------------------- settings member rows */

const MemberList = styled.div`
  ${motion}
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const MemberRow = styled.div`
  display: grid;
  grid-template-columns: minmax(200px, 2fr) minmax(250px, 3fr) auto;
  gap: 20px;
  align-items: center;
  padding: 16px 20px;
  background: var(--wp-surface);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

/** Matches Settings' user and team rows (identity, chips, actions). */
export function MemberListSkeleton({ rows = 5, label = 'Loading members' }) {
  return (
    <MemberList {...status(label)}>
      {Array.from({ length: rows }, (_, i) => (
        <MemberRow key={i}>
          <Row $gap="12px">
            <Bone $w="40px" $h="40px" $r="8px" />
            <Stack $gap="7px" $grow>
              <Bone $h="12px" $w={pick(['60%', '72%', '52%'], i)} />
              <Bone $h="9px" $w={pick(['80%', '68%', '74%'], i)} />
            </Stack>
          </Row>
          <Row>
            <Bone $w="76px" $h="22px" $r="11px" />
            {i % 2 === 0 && <Bone $w="92px" $h="22px" $r="11px" />}
          </Row>
          <Row>
            <Bone $w="32px" $h="32px" $r="6px" />
            <Bone $w="32px" $h="32px" $r="6px" />
          </Row>
        </MemberRow>
      ))}
    </MemberList>
  );
}

const FieldRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  padding: 16px 20px;
  background: var(--wp-surface);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
`;

/** Matches editable config rows (label + input groups + row actions), e.g. Kanban columns. */
export function FieldRowsSkeleton({ rows = 3, label = 'Loading configuration' }) {
  return (
    <MemberList {...status(label)}>
      {Array.from({ length: rows }, (_, i) => (
        <FieldRow key={i}>
          <Stack $gap="6px" $grow style={{ minWidth: 200 }}>
            <Bone $w="40px" $h="9px" />
            <Bone $h="34px" $r="6px" />
          </Stack>
          <Stack $gap="6px">
            <Bone $w="36px" $h="9px" />
            <Bone $w="56px" $h="34px" $r="6px" />
          </Stack>
          <Bone $w="96px" $h="18px" style={{ marginBottom: 8 }} />
          <Row>
            <Bone $w="32px" $h="32px" $r="6px" />
            <Bone $w="32px" $h="32px" $r="6px" />
            <Bone $w="32px" $h="32px" $r="6px" />
          </Row>
        </FieldRow>
      ))}
    </MemberList>
  );
}

/* --------------------------------------------------------------- calendar */

const MonthGrid = styled.div`
  ${motion}
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  border-top: 1px solid var(--wp-border);
  border-left: 1px solid var(--wp-border);

  .dow,
  .day {
    border-right: 1px solid var(--wp-border);
    border-bottom: 1px solid var(--wp-border);
  }

  .dow {
    height: 32px;
    display: grid;
    place-items: center;
  }

  .day {
    height: 96px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
`;

// (week-weekday) cells that carry an event bar, so the grid looks populated.
const EVENT_CELLS = new Set(['0-2', '1-4', '1-5', '2-1', '3-3', '3-4', '4-0']);

/** Month grid matching FullCalendar's dayGrid view. */
export function CalendarGridSkeleton() {
  return (
    <MonthGrid {...status('Loading calendar')}>
      {Array.from({ length: 7 }, (_, d) => (
        <div className="dow" key={`h${d}`}>
          <Bone $w="24px" $h="9px" />
        </div>
      ))}
      {Array.from({ length: 35 }, (_, i) => (
        <div className="day" key={i}>
          <Bone $w="14px" $h="10px" style={{ alignSelf: 'flex-end' }} />
          {EVENT_CELLS.has(`${Math.floor(i / 7)}-${i % 7}`) && (
            <Bone $h="16px" $r="3px" $w={pick(['92%', '70%', '84%'], i)} />
          )}
        </div>
      ))}
    </MonthGrid>
  );
}

const ItemList = styled.div`
  ${motion}
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
`;

/** Short list of two-line items (e.g. Calendar "Upcoming"). */
export function ItemListSkeleton({ rows = 3, label = 'Loading list' }) {
  return (
    <ItemList {...status(label)}>
      {Array.from({ length: rows }, (_, i) => (
        <Stack key={i} $gap="6px">
          <Bone $h="11px" $w={pick(['78%', '62%', '86%'], i)} />
          <Bone $h="9px" $w="46%" />
        </Stack>
      ))}
    </ItemList>
  );
}

/* ------------------------------------------------------------- page level */

const TASK_LIST_COLUMNS = 'minmax(280px, 1fr) 150px 100px 140px 110px 230px';
const PROJECT_COLUMNS = 'minmax(260px, 1fr) 200px 70px 80px 70px 120px 120px';
const ADMIN_COLUMNS = '2fr 1.5fr 1fr 1fr 1fr 1fr auto';
const MY_WORK_COLUMNS = '28px minmax(240px, 1fr) 180px 140px 96px 150px 44px';

const GroupShell = styled.div`
  ${motion}
  background: var(--wp-surface);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
  overflow: hidden;

  > .grp-head {
    height: 40px;
    padding: 0 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--wp-surface-2);
    border-bottom: 1px solid var(--wp-border);
  }
`;

/** My Work: KPI cards, scope/search toolbar, then due-date groups of task rows. */
export function MyWorkSkeleton() {
  return (
    <PagePad $max="1400px" style={{ gap: 16, height: 'auto' }}>
      <KpiStripSkeleton count={4} />
      <ToolbarShape {...status('Loading my work')} style={{ marginTop: -16 }}>
        <Bone $w="250px" $h="32px" $r="6px" />
        <Bone $w="260px" $h="32px" $r="6px" />
      </ToolbarShape>
      {[3, 4].map((rows, g) => (
        <GroupShell key={g} {...status('Loading tasks')}>
          <div className="grp-head">
            <Bone $w="14px" $h="14px" />
            <Bone $w={g ? '90px' : '64px'} $h="11px" />
            <Bone $w="24px" $h="20px" $r="10px" />
          </div>
          {Array.from({ length: rows }, (_, r) => (
            <TableLine key={r} className="sk-row" $columns={MY_WORK_COLUMNS} $rowHeight="52px">
              <Bone $w="20px" $h="20px" $r="50%" />
              <TableCell kind="title" r={r + g} c={0} />
              <Row>
                <Bone $w="8px" $h="8px" $r="2px" />
                <Bone $w={pick(['70%', '55%', '82%'], r)} $h="10px" />
              </Row>
              <TableCell kind="tag" r={r} c={1} />
              <TableCell kind="tag" r={r} c={2} />
              <TableCell kind="tag" r={r} c={3} />
              <span />
            </TableLine>
          ))}
        </GroupShell>
      ))}
    </PagePad>
  );
}

/** Task board area only (used while tasks load under the real toolbar). */
export function TaskViewSkeleton({ view = 'kanban', columns = 3 }) {
  if (view === 'list') {
    return (
      <TableSkeleton
        fill
        label="Loading tasks"
        columns={TASK_LIST_COLUMNS}
        cells={['title', 'tag', 'tag', 'tag', 'avatars', 'actions']}
        rows={10}
      />
    );
  }
  return <BoardSkeleton columns={columns} />;
}

/** Whole Tasks page body (toolbar + board) while its projects load. */
export function TasksPageSkeleton({ columns = 3 }) {
  return (
    <>
      <BoardToolbarSkeleton />
      <BoardSkeleton columns={columns} />
    </>
  );
}

export function ProjectTableSkeleton() {
  return (
    <TableSkeleton
      label="Loading projects"
      columns={PROJECT_COLUMNS}
      cells={['swatch', 'progress', 'num', 'num', 'num', 'text', 'actions']}
      rows={6}
      rowHeight="56px"
    />
  );
}

/** Admin task table; `bare` renders rows only, under the real sortable header. */
export function AdminTableSkeleton({ bare = false }) {
  return (
    <TableSkeleton
      label="Loading tasks"
      columns={ADMIN_COLUMNS}
      cells={['title', 'avatars', 'tag', 'tag', 'text', 'text', 'actions']}
      rows={8}
      rowHeight="64px"
      bare={bare}
      rowPadding={bare ? '0 24px' : undefined}
      gap={bare ? '16px' : undefined}
    />
  );
}

const PagePad = styled.div`
  height: 100%;
  min-height: 0;
  width: 100%;
  max-width: ${(p) => p.$max || 'none'};
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: ${(p) => p.$pad || '16px 20px 32px'};

  @media (max-width: 768px) {
    padding: 12px;
  }
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: ${(p) => p.$left} minmax(0, 1fr);
  gap: ${(p) => p.$gap || '20px'};
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;

    > :first-child {
      display: none;
    }
  }
`;

const Panel = styled.div`
  ${(p) => (p.$animate ? motion : '')}
  background: var(--wp-surface);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
  padding: ${(p) => p.$pad || '12px'};
  display: flex;
  flex-direction: ${(p) => (p.$row ? 'row' : 'column')};
  flex-wrap: wrap;
  gap: ${(p) => p.$gap || '10px'};
`;

const SectionTitle = styled.div`
  ${motion}
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const NavItem = styled(Row)`
  height: 34px;
  padding: 0 10px;
`;

/**
 * Route-level fallback while a page's code chunk loads. Each shape matches the
 * page about to render, including its toolbar, so nothing jumps on arrival.
 */
export function PageSkeleton({ path }) {
  switch (path) {
    case '/projects':
      return (
        <PagePad $max="1400px">
          <ToolbarShape {...status('Loading projects')}>
            <Bone $w="280px" $h="32px" $r="6px" />
            <Bone $w="90px" $h="10px" />
            <span className="spacer" />
            <Bone $w="118px" $h="32px" $r="6px" />
          </ToolbarShape>
          <ProjectTableSkeleton />
        </PagePad>
      );
    case '/calendar':
      return (
        <PagePad $pad="12px 20px 24px">
          <ToolbarShape {...status('Loading calendar')}>
            <Bone $w="64px" $h="32px" $r="6px" />
            <Bone $w="64px" $h="32px" $r="6px" />
            <Bone $w="160px" $h="16px" />
            <span className="spacer" />
            <Bone $w="200px" $h="32px" $r="6px" />
            <Bone $w="104px" $h="32px" $r="6px" />
          </ToolbarShape>
          <TwoCol $left="250px" $gap="8px">
            <Panel $animate>
              <Bone $h="32px" $r="6px" />
              <Bone $h="160px" $r="6px" />
              {['78%', '62%', '86%'].map((w) => (
                <Stack key={w} $gap="6px">
                  <Bone $h="11px" $w={w} />
                  <Bone $h="9px" $w="46%" />
                </Stack>
              ))}
            </Panel>
            <Panel $animate $pad="10px">
              <CalendarGridSkeleton />
            </Panel>
          </TwoCol>
        </PagePad>
      );
    case '/admin':
      return (
        <PagePad $max="1600px">
          <KpiStripSkeleton count={4} />
          <Panel $animate $row $gap="12px" {...status('Loading filters')}>
            <Bone $w="320px" $h="36px" $r="6px" />
            <Bone $w="160px" $h="36px" $r="6px" />
            <Bone $w="160px" $h="36px" $r="6px" />
            <Bone $w="160px" $h="36px" $r="6px" />
          </Panel>
          <AdminTableSkeleton />
        </PagePad>
      );
    case '/settings':
      return (
        <PagePad $max="1440px">
          <TwoCol $left="232px">
            <Panel $animate $pad="8px" $gap="2px" {...status('Loading settings')}>
              <Bone $h="32px" $r="6px" style={{ marginBottom: 8 }} />
              {['70%', '58%', '76%', '50%'].map((w) => (
                <NavItem key={w}>
                  <Bone $w="16px" $h="16px" />
                  <Bone $w={w} $h="10px" />
                </NavItem>
              ))}
            </Panel>
            <Stack $gap="16px">
              <SectionTitle>
                <Bone $w="150px" $h="16px" />
                <Bone $w="340px" $h="10px" />
              </SectionTitle>
              <KpiStripSkeleton count={3} min="200px" iconSize="32px" />
              <Panel $pad="20px" $gap="16px">
                <ToolbarShape>
                  <Bone $w="140px" $h="14px" />
                  <span className="spacer" />
                  <Bone $w="220px" $h="32px" $r="6px" />
                  <Bone $w="112px" $h="32px" $r="6px" />
                </ToolbarShape>
                <MemberListSkeleton rows={4} />
              </Panel>
            </Stack>
          </TwoCol>
        </PagePad>
      );
    case '/tasks':
      return (
        <PagePad $pad="12px 20px 16px">
          <TasksPageSkeleton />
        </PagePad>
      );
    default:
      return <MyWorkSkeleton />;
  }
}

/* --------------------------------------------------------------- app boot */

const Shell = styled.div`
  height: 100dvh;
  display: flex;
  background: var(--wp-bg);
  overflow: hidden;
`;

const ShellSidebar = styled.div`
  width: 232px;
  flex-shrink: 0;
  background: var(--wp-sidebar-bg);
  border-right: 1px solid var(--wp-sidebar-border);
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (max-width: 1024px) {
    display: none;
  }
`;

const ShellMain = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;

  > .shell-top {
    height: 52px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 20px;
    border-bottom: 1px solid var(--wp-border);
    background: var(--wp-header-bg);
  }

  > .shell-body {
    flex: 1;
    min-height: 0;
  }
`;

function readSignedInHint() {
  try {
    return Boolean(localStorage.getItem('user'));
  } catch {
    return false;
  }
}

/**
 * Shown while the session resolves. Returning users (a cached profile exists)
 * see the app frame they are about to land in; first-time visitors get a plain
 * background, so the login page never follows a fake app frame.
 */
export function AppBootSkeleton() {
  if (!readSignedInHint()) {
    return <Shell {...status('Loading')} />;
  }
  return <AppShellSkeleton path={window.location.pathname} />;
}

/** Sidebar + top bar + the page skeleton for `path`. */
export function AppShellSkeleton({ path }) {
  return (
    <Shell>
      <ShellSidebar {...status('Loading workspace')}>
        <Row $gap="10px" style={{ height: 36, padding: '0 6px' }}>
          <Bone $dark $w="28px" $h="28px" $r="6px" />
          <Stack $gap="6px">
            <Bone $dark $w="76px" $h="11px" />
            <Bone $dark $w="110px" $h="8px" />
          </Stack>
        </Row>
        <Bone $dark $h="32px" $r="6px" />
        <Stack $gap="4px">
          <Bone $dark $w="70px" $h="8px" style={{ margin: '6px 10px' }} />
          {['46%', '58%', '52%'].map((w) => (
            <NavItem key={w} $gap="10px">
              <Bone $dark $w="16px" $h="16px" />
              <Bone $dark $w={w} $h="10px" />
            </NavItem>
          ))}
        </Stack>
      </ShellSidebar>
      <ShellMain>
        <div className="shell-top">
          <Bone $w="72px" $h="14px" />
          <span style={{ flex: 1 }} />
          <Bone $w="220px" $h="32px" $r="6px" />
          <Bone $w="104px" $h="32px" $r="6px" />
        </div>
        <div className="shell-body">
          <PageSkeleton path={path} />
        </div>
      </ShellMain>
    </Shell>
  );
}

/* ---------------------------------------------------------------- inline */

const Spinner = styled.span`
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid currentColor;
  border-right-color: transparent;
  opacity: 0.8;
  animation: ${spin} 0.7s linear infinite;
`;

/** Small spinner for in-button pending states (e.g. "Signing in"). */
export function InlineLoader({ message = 'Loading' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }} role="status">
      <Spinner aria-hidden />
      <span>{message}</span>
    </span>
  );
}
