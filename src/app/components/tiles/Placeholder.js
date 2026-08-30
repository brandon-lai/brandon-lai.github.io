/** Empty slot — replace with real content when you have it. */
export default function Placeholder({ glyph, title, note }) {
  return (
    <div className="empty">
      {glyph && (
        <div className="empty-glyph" aria-hidden="true">
          {glyph}
        </div>
      )}
      {title && <div className="empty-title">{title}</div>}
      {note && <div className="empty-note">{note}</div>}
    </div>
  );
}
