/** Scoped sidebar styles for registration by the client plugin. */
export const leftFilesCss = `
.dsh-left-files {
  box-sizing: border-box;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-inline-size: 0;
  min-block-size: 0;
  max-block-size: 100%;
  inline-size: 100%;
  container-type: inline-size;
  color: var(--dsw-alias-label-primary);
}

.left-workspace-files__navigator { display: contents; }
.left-workspace-files__title-slot {
  flex: 1;
  min-inline-size: 0;
  overflow: hidden;
  transition: opacity 120ms var(--ds-ease-in-out, ease-in-out);
}
.left-workspace-files__header[data-search-open] > .left-workspace-files__title-slot {
  opacity: 0;
  pointer-events: none;
}

.left-workspace-files__search {
  box-sizing: border-box;
  display: flex;
  flex: none;
  align-items: center;
  inline-size: 28px;
  block-size: 32px;
  margin-inline-start: auto;
  margin-inline-end: var(--dsh-sidebar-paint-inset, 3px);
  border-radius: var(--dsw-radius-md);
  overflow: hidden;
  transition: inline-size 180ms var(--ds-ease-in-out, ease-in-out);
}

.left-workspace-files__header[data-search-open] > .left-workspace-files__search {
  inline-size: calc(100% - 2 * var(--dsh-sidebar-paint-inset, 3px));
  border: 0.5px solid var(--dsw-alias-border-l4);
}

.left-workspace-files__search-open,
.left-workspace-files__search-close {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}

.left-workspace-files__search-open { inline-size: 28px; block-size: 28px; }
.left-workspace-files__search-open[aria-expanded='true'] { color: var(--dsw-alias-label-tertiary); cursor: text; }
.left-workspace-files__search-close { inline-size: 24px; block-size: 24px; margin-inline-end: 4px; }

.left-workspace-files[data-rail] .left-workspace-files__header { flex-direction: column; gap: 4px; }
.left-workspace-files[data-rail] .left-workspace-files__title-slot { flex: none; }
.left-workspace-files[data-rail] .left-workspace-files__search {
  inline-size: 36px;
  block-size: 36px;
  margin: 0;
  transition: none;
}
.left-workspace-files[data-rail] .left-workspace-files__search-open {
  inline-size: 36px;
  block-size: 36px;
  border-radius: var(--dsw-radius-md);
  color: var(--dsw-alias-label-primary);
}

.left-workspace-files__search-input {
  flex: 1;
  inline-size: 0;
  min-inline-size: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 18px;
  appearance: none;
}

.left-workspace-files__search-input,
.left-workspace-files__search-close { transition: opacity 120ms var(--ds-ease-in-out, ease-in-out); }
.left-workspace-files__search-input:disabled,
.left-workspace-files__search-close:disabled { opacity: 0; visibility: hidden; }

.left-workspace-files__search-input::placeholder { color: var(--dsw-alias-label-tertiary); }
.left-workspace-files__search-input::-webkit-search-cancel-button { appearance: none; }

.left-workspace-files__search-open:focus-visible,
.left-workspace-files__search-close:focus-visible,
.left-workspace-files__search:has(> .left-workspace-files__search-input:focus-visible) {
  outline: var(--dsw-focus-ring-width, 1px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: -2px;
}

@media (hover: hover) {
  .left-workspace-files__search-open[aria-expanded='false']:hover,
  .left-workspace-files__search-close:hover { background: var(--dsw-alias-interactive-bg-hover); }
}

@media (prefers-reduced-motion: reduce) {
  .left-workspace-files__title-slot,
  .left-workspace-files__search,
  .left-workspace-files__search-input,
  .left-workspace-files__search-close { transition: none; }
}

.dsh-left-files__scroll {
  font-size: 13px;
  line-height: 1.4;
  flex: 1 1 auto;
  min-block-size: 0;
  min-inline-size: 0;
  overflow: auto;
  overscroll-behavior: contain;
  overflow-anchor: none;
  padding-inline: 6px;
  padding-block-end: 6px;
}

.dsh-left-files__row {
  box-sizing: border-box;
  color: inherit;
  background: none;
  border: 0;
  border-radius: 6px;
  font: inherit;
  cursor: pointer;
}

.dsh-left-files__row,
.dsh-left-files__notice {
  --left-files-step: clamp(10px, calc(3.25px + 3.75cqi), 13px);
  --left-files-indent: min(calc(var(--left-files-depth, 0) * var(--left-files-step)), 30cqi);
  --left-files-content-start: 6px;
  position: relative;
  padding-inline-start: calc(var(--left-files-content-start) + var(--left-files-indent));
  padding-inline-end: 6px;
}

.dsh-left-files__row {
  --left-files-content-start: 16px;
  display: flex;
  align-items: flex-start;
  inline-size: 100%;
  min-block-size: 24px;
  padding-block: 4px;
  text-align: start;
}

.dsh-left-files__row[aria-disabled='true'] {
  color: var(--dsw-alias-label-secondary);
  cursor: default;
}

.dsh-left-files__icon {
  flex: none;
  margin-inline-end: 6px;
  margin-block-start: 1px;
}

.dsh-left-files__row[data-type='directory'] > .dsh-left-files__icon {
  color: var(--dsw-alias-label-tertiary);
}

/* One background draws every ancestor guide. It starts at the centre of the root icon
   and ends 1px before this line's content, including when the indent is capped. */
.dsh-left-files__row[aria-level]:not([aria-level='1'])::before,
.dsh-left-files__notice::before {
  content: '';
  position: absolute;
  inset-block: 0;
  inset-inline-start: 24px;
  inline-size: max(0px, calc(var(--left-files-content-start) + var(--left-files-indent) - 25px));
  background-image: repeating-linear-gradient(
    var(--left-files-guide-direction, to right),
    var(--dsw-alias-border-l3) 0 0.5px,
    transparent 0.5px var(--left-files-step)
  );
  pointer-events: none;
}

:is(.dsh-left-files__row, .dsh-left-files__notice):dir(rtl)::before {
  --left-files-guide-direction: to left;
}

.dsh-left-files__label {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr);
  min-inline-size: 0;
}

/* Shape carries the activity so it survives colour-blindness and forced colours:
   read is a hollow ring, write a filled disc, and both a ring whose lower half is filled.
   Colour repeats the distinction, with every written state in the warn tone. */
.dsh-left-files__activity {
  --left-files-activity-ring: 1.5px;
  box-sizing: border-box;
  flex: none;
  align-self: center;
  inline-size: 7px;
  block-size: 7px;
  margin-inline-start: 6px;
  border: var(--left-files-activity-ring) solid currentColor;
  border-radius: 50%;
  forced-color-adjust: none;
}

.dsh-left-files__activity[data-activity-scope='ancestor'] {
  --left-files-activity-ring: 1px;
  inline-size: 5px;
  block-size: 5px;
  opacity: 0.85;
}

.dsh-left-files__activity[data-activity='read'] {
  color: var(--dsw-alias-state-business-primary);
}

.dsh-left-files__activity[data-activity='write'],
.dsh-left-files__activity[data-activity='both'] {
  color: var(--dsw-alias-state-warn-primary);
}

.dsh-left-files__activity[data-activity='write'] {
  background: currentColor;
}

.dsh-left-files__activity[data-activity='both'] {
  background: linear-gradient(to top, currentColor 50%, transparent 50%);
}

@media (forced-colors: active) {
  .dsh-left-files__activity { color: CanvasText; }
}

/* In the current-turn view every row was touched, so read-only rows step back one grey level
   and the rows that the agent changed stand out. */
.dsh-left-files__row[data-read-only] > .dsh-left-files__label {
  color: var(--dsw-alias-label-secondary);
}

.dsh-left-files__name,
.dsh-left-files__tail {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* Fades from @deepseek-ai/dsh-client-ui-workspace 0.2.2-rc.5,
   src/client/rows/Rows.module.css (.sessionRow .title). */
.dsh-left-files__name[data-scrolled] {
  mask-image: linear-gradient(to right, transparent, #000 12px);
}

.dsh-left-files__name[data-clipped] {
  mask-image: linear-gradient(to left, transparent, #000 12px);
}

.dsh-left-files__name[data-scrolled][data-clipped] {
  mask-image: linear-gradient(to right, transparent, #000 12px, #000 calc(100% - 12px), transparent);
}

.dsh-left-files__path {
  display: flex;
  align-items: flex-end;
  direction: ltr;
  font: var(--dsw-font-xxs-12);
}

.dsh-left-files__prefix {
  display: -webkit-box;
  min-inline-size: 0;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--dsw-alias-label-tertiary);
}

.dsh-left-files__tail {
  flex: 0 0 auto;
  max-inline-size: 100%;
  direction: rtl;
}

@container (width < 220px) {
  .dsh-left-files__prefix {
    display: block;
    direction: rtl;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.dsh-left-files__label mark {
  color: var(--dsw-alias-state-business-primary);
  background: transparent;
}

.dsh-left-files__tail,
.dsh-left-files__notice {
  color: var(--dsw-alias-label-secondary);
}

.dsh-left-files__notice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-block-size: 24px;
  overflow-wrap: anywhere;
}

.dsh-left-files__notice [role='alert'] {
  color: var(--dsw-alias-label-primary);
}

/* Match .emptyState in @deepseek-ai/dsh-client-ui-workspace 0.2.2-rc.5
   (src/client/rows/WorkspaceBrowser.module.css), with symmetric vertical
   padding because the recent files section sizes to its content. */
.dsh-left-files__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 12px 18px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
  text-align: center;
}

.dsh-left-files__empty > svg {
  flex: none;
  margin-block-end: 4px;
  color: var(--dsw-alias-label-caption);
}

.dsh-left-files :is(.dsh-left-files__row, .dsh-left-files__scroll):focus-visible {
  outline: 1px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: -1px;
}

/* Native hover clipping in Rows.module.css (.sessionRow:hover .title). */
@media (hover: hover) {
  .dsh-left-files__row:hover .dsh-left-files__name {
    text-overflow: clip;
  }

  .dsh-left-files__row:not([aria-disabled='true']):hover {
    background: var(--dsw-alias-interactive-bg-hover);
  }
}

@media (pointer: coarse) {
  .left-workspace-files__search-input { font-size: 16px; }
  .dsh-left-files__row {
    min-block-size: 40px;
  }
}
`
