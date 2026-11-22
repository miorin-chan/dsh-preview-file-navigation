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

.dsh-left-files__search,
.dsh-left-files__scroll {
  font-size: 13px;
  line-height: 1.4;
}

.dsh-left-files__search {
  display: flex;
  align-items: stretch;
  flex: 0 0 auto;
  min-inline-size: 0;
  gap: 4px;
  padding: 6px;
}

.dsh-left-files__field {
  flex: 1 1 0;
  min-inline-size: 0;
}

.dsh-left-files__field input {
  min-inline-size: 0;
}

.dsh-left-files__search input::-webkit-search-cancel-button {
  appearance: none;
}

.dsh-left-files__scroll {
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
  padding-inline-start: calc(6px + var(--left-files-indent));
  padding-inline-end: 6px;
}

.dsh-left-files__row {
  display: flex;
  align-items: flex-start;
  inline-size: 100%;
  min-block-size: 24px;
  padding-block: 4px;
  padding-inline-start: calc(16px + var(--left-files-indent));
  text-align: start;
  position: relative;
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

.dsh-left-files__row[aria-level]:not([aria-level='1'])::before {
  content: '';
  position: absolute;
  inset-block: 0;
  inset-inline-start: calc(12px + var(--left-files-indent) - var(--left-files-step));
  border-inline-start: 1px solid var(--dsw-alias-border-l2);
  pointer-events: none;
}

.dsh-left-files__label {
  display: grid;
  min-inline-size: 0;
}

.dsh-left-files__name,
.dsh-left-files__tail {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
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

.dsh-left-files :is(.dsh-left-files__row, .dsh-left-files__scroll):focus-visible {
  outline: 1px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: -1px;
}

@media (hover: hover) {
  .dsh-left-files__row:not([aria-disabled='true']):hover {
    background: var(--dsw-alias-interactive-bg-hover);
  }

}

@media (pointer: coarse) {
  .dsh-left-files__search input {
    font-size: max(16px, 1em);
  }
  .dsh-left-files__search input,
  .dsh-left-files__row {
    min-block-size: 40px;
  }
}
`
