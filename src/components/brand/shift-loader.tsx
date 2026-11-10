import ShiftLogo from "./shift-logo";

export default function ShiftLoader() {
  return (
    <main
      id="main-content"
      className="shift-loader"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="shift-loader__mark">
        <ShiftLogo size="large" alt="" loading="eager" className="shift-loader__logo" />
        <span className="shift-loader__sweep" aria-hidden="true" />
      </div>
      <p className="shift-loader__label">ENTERING SHIFT</p>
    </main>
  );
}
