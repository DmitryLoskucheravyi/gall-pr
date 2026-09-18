// A global stylesheet imported for its side effect.
//
// Next's own types declare `*.module.scss` (the CSS-modules case, which is all
// but one of the 62 stylesheets here) but not a bare `import './x.scss'`, and
// TypeScript 6 refuses a side-effect import it has no declaration for.
declare module '*.scss';
declare module '*.css';
