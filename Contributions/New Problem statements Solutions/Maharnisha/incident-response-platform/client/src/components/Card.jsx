// Generic surface container used across dashboard, detail and form pages.
export default function Card({ title, description, actions, className = '', children, as: Component = 'section' }) {
  return (
    <Component className={`card ${className}`.trim()}>
      {(title || actions) && (
        <header className="card-header">
          <div>
            {title && <h2 className="card-title">{title}</h2>}
            {description && <p className="card-description">{description}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className="card-body">{children}</div>
    </Component>
  );
}
