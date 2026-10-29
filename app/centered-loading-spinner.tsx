type CenteredLoadingSpinnerProps = {
  label: string;
};

export default function CenteredLoadingSpinner({ label }: CenteredLoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        display: "grid",
        minHeight: "calc(100vh - 56px)",
        placeItems: "center",
        color: "var(--mikoroku-accent, #9d1018)",
      }}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="42 16"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 12 12"
            to="360 12 12"
            dur="0.8s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
}
