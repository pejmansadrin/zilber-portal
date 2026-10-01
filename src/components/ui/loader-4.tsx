"use client";

import styled, { keyframes } from "styled-components";

export type LoaderProps = {
  /** Total width and height in pixels. The original demo is 162px. */
  size?: number;
  label?: string;
  /** Use when a surrounding button or status already describes the operation. */
  decorative?: boolean;
  className?: string;
};

export default function Loader({
  size = 162,
  label = "در حال بارگذاری…",
  decorative = false,
  className,
}: LoaderProps) {
  return (
    <StyledWrapper
      $size={size}
      className={className}
      role={decorative ? undefined : "status"}
      aria-live={decorative ? undefined : "polite"}
      aria-atomic={decorative ? undefined : true}
      aria-hidden={decorative || undefined}
    >
      <span className="loader" aria-hidden="true">
        <span className="cell d-0" />
        <span className="cell d-1" />
        <span className="cell d-2" />
        <span className="cell d-1" />
        <span className="cell d-2" />
        <span className="cell d-2" />
        <span className="cell d-3" />
        <span className="cell d-3" />
        <span className="cell d-4" />
      </span>
      {!decorative && <span className="loader-label">{label}</span>}
    </StyledWrapper>
  );
}

const ripple = keyframes`
  0%, 60%, 100% { background-color: transparent; }
  30% { background-color: var(--cell-color); }
`;

// Inline elements keep the same nine-cell design valid inside a button too.
const StyledWrapper = styled.span<{ $size: number }>`
  --loader-size: ${({ $size }) => $size}px;
  display: inline-flex;
  flex: 0 0 auto;
  width: var(--loader-size);
  height: var(--loader-size);
  vertical-align: middle;

  .loader {
    --loader-color: var(--accent, var(--brand-accent, #2563eb));
    --cell-spacing: 1px;
    --cells: 3;
    --cell-size: calc(
      var(--loader-size) / var(--cells) - 2 * var(--cell-spacing)
    );
    --total-size: calc(
      var(--cells) * (var(--cell-size) + 2 * var(--cell-spacing))
    );
    display: flex;
    flex-wrap: wrap;
    direction: ltr;
    width: var(--total-size);
    height: var(--total-size);
  }

  .cell {
    flex: 0 0 var(--cell-size);
    height: var(--cell-size);
    margin: var(--cell-spacing);
    background-color: transparent;
    box-sizing: border-box;
    border-radius: min(4px, calc(var(--cell-size) / 4));
    animation: ${ripple} 1.5s ease infinite;
  }

  .cell.d-1 {
    animation-delay: 100ms;
  }
  .cell.d-2 {
    animation-delay: 200ms;
  }
  .cell.d-3 {
    animation-delay: 300ms;
  }
  .cell.d-4 {
    animation-delay: 400ms;
  }
  .cell:nth-child(1) {
    --cell-color: var(--loader-color);
  }
  .cell:nth-child(2) {
    --cell-color: color-mix(in srgb, var(--loader-color) 95%, var(--brand-accent, #2563eb));
  }
  .cell:nth-child(3) {
    --cell-color: color-mix(in srgb, var(--loader-color) 90%, var(--brand-accent, #2563eb));
  }
  .cell:nth-child(4) {
    --cell-color: color-mix(in srgb, var(--loader-color) 85%, var(--brand-accent, #2563eb));
  }
  .cell:nth-child(5) {
    --cell-color: color-mix(in srgb, var(--loader-color) 80%, var(--brand-accent, #2563eb));
  }
  .cell:nth-child(6) {
    --cell-color: color-mix(in srgb, var(--loader-color) 75%, var(--brand-accent, #2563eb));
  }
  .cell:nth-child(7) {
    --cell-color: color-mix(in srgb, var(--loader-color) 70%, var(--brand-accent, #2563eb));
  }
  .cell:nth-child(8) {
    --cell-color: color-mix(in srgb, var(--loader-color) 65%, var(--brand-accent, #2563eb));
  }
  .cell:nth-child(9) {
    --cell-color: color-mix(in srgb, var(--loader-color) 60%, var(--brand-accent, #2563eb));
  }

  .loader-label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .cell {
      animation: none;
      background-color: var(--cell-color);
    }
  }
`;
