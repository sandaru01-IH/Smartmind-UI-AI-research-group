/**
 * Runs before first paint. Applies the saved theme, or the system preference, and marks the
 * document as JS-enabled so reveal animations can start hidden.
 */
const script = `(function(){try{var d=document.documentElement;d.classList.add('js');var s=null;try{s=localStorage.getItem('sm-theme')}catch(e){}var t=s==='light'||s==='dark'?s:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');d.dataset.theme=t}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
