# Crew-hour approval

- Add a private review status, reviewer, decision time and rejection reason to each crew labor entry. Only the subcontractor responsible for billing that work order can approve or reject through a protected action; rejection requires a note.
- Show **Pending**, **Approved**, and **Rejected** badges with **Approve** and **Reject** controls in **Scope & Labor → item → Private costs & margin → Crew charges**. Crews can see the decision and rejection note on their own entries, but never subcontractor markup or margins.
- Make new crew-derived pricing use approved hours only. Pending or rejected hours cannot be confirmed into a new crew-based price. Historical entries keep their current pricing until reviewed, and frozen submissions or approved order totals are never recalculated by this review.
- Add focused permission and pricing tests. Verify the current work order on desktop and phones with temporary review data, restore all live records, and run the required 320/394px mobile audit.
