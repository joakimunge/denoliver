import { DirEntry } from './utils/utils.ts'

export default (entries: DirEntry[], path: string) => {
  const sorted = entries.sort((x) => (x.isDirectory ? -1 : 1))
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta charset="utf-8" />
    <title>denoliver - ${path}</title>
  </head>
  <style>
  :root {
    --text: #424242;
    --background: #fff;
    --text-highlight: #a8a6b3;
    --title: #4a5560;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #2b333b;
    --text: #c1c3c4;
    --text-highlight: #fff;
    --title: #4a5560;
  }
}

html,
  body {
    height: 100%;
    width: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    -webkit-font-smoothing: antialiased;
    box-sizing: border-box;
    background: var(--background);
    margin: 0;
  }
  
  #denoliver {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin: 0 auto;
        max-width:1280px;
    padding: 4rem;
    padding-top: 1rem;
    padding-bottom: 1rem;

  }
  
  #denoliver > h1 {
    font-size: 36px;
    margin-bottom: 0;
    color: var(--title);
    align-self: flex-start;
  }
  
  strong {
    opacity: 0.2;
    font-weight: 200;
  }

  a {
    text-decoration: none;
    position: relative;
    color: var(--text);
    font-size: 14px;
    font-style: bold;
    font-family:
    "SFMono-Regular",
    Consolas,
    "Liberation Mono",
    Menlo,
    Courier,
    monospace;
  }

a:hover {
  color: var(--text-highlight);
}

a::before {
  content: "";
  width: 4px;
  height: 0%;
  background: #f27a3a;
  display: block;
  position: absolute;
  left: -8px;
  transition: 0.3s cubic-bezier(0.17, 0.67, 0.16, 0.99);
}

a:hover::before {
  height: 100%;
  transition: 0.3s cubic-bezier(0.17, 0.67, 0.16, 0.99);
}

  .contents {
    display: grid;
    padding: 4rem;
    width: 100%;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    grid-gap: 2rem;

  }

.contents > span {
  display: flex;
  align-items: center;
}
  
  </style>
  <body>
    <div id="denoliver">
      <h1>${path}</h1>
      <div class="contents">
        ${sorted
          .map(
            (entry) =>
              `<span>
              <a href="${entry.url}" 
              class="${entry.isFile ? 'file' : 'directory'}" 
              >
            ${entry.name}
            </a>
            </span>`
          )
          .join('')}
      </div>
    </div>
  </body>
</html>
`
}
