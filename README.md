# TypeRush — Typing Speed Challenge

TypeRush is a polished, responsive typing speed game built with **HTML, CSS, and vanilla JavaScript**. Test your words per minute (WPM), accuracy, and consistency in timed or word-count challenges.

## ✨ Features

- **Two test modes:** timed challenges (15, 30, 60, and 120 seconds) and word-count challenges (10, 25, 50, and 100 words).
- **Live typing feedback:** correct and incorrect characters, live WPM, accuracy, errors, progress, and remaining time/words.
- **Content options:** normal words, punctuation, and numbers/symbols.
- **Results screen:** net WPM, raw WPM, accuracy, character counts, errors, and a speed graph.
- **Progress dashboard:** personal bests, average speed, completed tests, recent history, and achievements.
- **Canvas charts:** WPM trend graph without charting dependencies.
- **Optional keystroke sounds:** synthesized with the Web Audio API; no audio files required.
- **Local persistence:** settings and up to 100 results are saved with `localStorage`.
- **Responsive and accessible:** keyboard-operable controls, labels, dialog semantics, visible focus states, and reduced-motion support.
- **No framework, build step, or npm dependencies.**

## 🧰 Built with

- HTML5
- CSS3 (custom properties, grid/flexbox, responsive layouts, animations)
- Vanilla JavaScript (DOM APIs, `localStorage`, Canvas 2D, Web Audio API)

## 🚀 Run in GitHub Codespaces

**Do not run `node app.js`.** `app.js` runs in the browser and uses browser APIs such as `document`, `localStorage`, Canvas, and Web Audio.

1. Open your GitHub repository in Codespaces.
2. Confirm these files are in the same project root: `index.html`, `styles.css`, and `app.js`.
3. In the Codespaces terminal, run a static web server:

   ```bash
   python3 -m http.server 8000
   ```

   If Python 3 is unavailable, use the VS Code **Live Server** extension, or try:

   ```bash
   npx --yes serve .
   ```

   The `npx` option may download a temporary static server package, but the project itself has no npm dependencies.
4. Open the **Ports** tab in Codespaces.
5. Find port **8000**, click **Open in Browser**, and start typing.

Stop the server with `Ctrl+C` in the terminal.

## 💻 Run locally

### Quick start
Open `index.html` in a modern browser. A local server is recommended for consistent browser behavior.

### Python local server
Run this in the project folder:

```bash
python3 -m http.server 8000
```

On Windows, you may use:

```powershell
py -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000).

## 🎮 How to play

1. Choose **Time** or **Words** mode.
2. Pick a duration or word count.
3. Choose normal words, punctuation, or numbers and symbols.
4. Click the displayed text area and type the prompt as accurately as possible. The timer begins with the first character.
5. Review your WPM, accuracy, errors, and speed graph when the test ends.
6. Open **Your stats** to review your history and achievements.

### WPM and accuracy

- **Net WPM:** correctly typed characters divided by five, normalized to one minute.
- **Raw WPM:** all typed characters divided by five, normalized to one minute.
- **Accuracy:** correctly typed characters divided by all typed characters, as a percentage.
- **Errors:** typed characters that do not match the target at their position, including extra characters where applicable.

WPM values are rounded to the nearest whole number. Live WPM can fluctuate, especially early in a test.

## ⌨️ Keyboard and sound

- Click the typing area to focus the input.
- Use the **Restart** button to start a fresh test.
- Toggle synthesized keystroke sounds from the top bar.
- Focus mode reduces visual distractions.
- Press `Esc` to close dialogs or exit focus mode.

## 📁 Project structure

```text
typerush/
├── index.html    # Page structure and accessible controls
├── styles.css    # Theme, layouts, responsive styles, animations
├── app.js        # Game logic, metrics, charts, history, settings
├── README.md     # Documentation
├── LICENSE       # MIT license
└── .gitignore    # Common local/editor files
```

## 🌐 Deploy on GitHub Pages

1. Create a GitHub repository, for example `typerush`.
2. Add all project files to the repository root and push them to the `main` branch.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select branch `main` and folder `/(root)`, then click **Save**.
6. Wait for GitHub Pages to publish. The live URL will appear in the Pages settings.

No build command is required because TypeRush is a static site.

## 📤 Push your project to GitHub

After creating an empty repository, run these commands in the project folder:

```bash
git init
git add .
git commit -m "Build TypeRush typing speed game"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/typerush.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username. If the repository is already initialized, skip `git init`.

## 💾 Privacy and storage

TypeRush stores history and sound preferences in the current browser's `localStorage`. The data is not sent to a server and does not automatically sync across browsers or devices. Clearing browser site data may erase saved results.

## 🗺️ Ideas for future versions

- Import/export personal records
- Custom text passages
- Multiplayer races and leaderboards
- Daily challenges and streak calendar
- More languages and keyboard layouts
- Automated tests for WPM, accuracy, and test-state transitions

## 📄 License

Released under the MIT License. See [`LICENSE`](LICENSE).
