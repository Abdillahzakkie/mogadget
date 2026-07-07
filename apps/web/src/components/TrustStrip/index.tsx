// Thin green trust bar that runs across the top of every public page (spec §9).
export function TrustStrip() {
  return (
    <div style={strip}>
      1-Month Warranty on Everything · Physical Store in Computer Village, Ikeja · Nationwide
      Delivery · Free Delivery in Lagos
    </div>
  );
}

const strip = {
  background: "var(--brand)",
  color: "#fff",
  font: "500 12px var(--font-body)",
  padding: "8px 20px",
  textAlign: "center" as const,
};
