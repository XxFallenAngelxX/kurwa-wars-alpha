# KURWA WARS – Browser Alpha v0.52

## GitHub Desktop + GitHub Pages
1. ZIP komplett entpacken. Ordner `kurwa-wars-alpha` in GitHub Desktop ziehen (File > Add local repository). Das Git-Repository ist bereits initialisiert und hat einen ersten Commit.
2. Publish repository: Name `kurwa-wars-alpha`. Für kostenloses GitHub Pages auf GitHub Free muss das Repository öffentlich sein (Keep this code private deaktivieren). Wenn privat gewünscht: stattdessen Cloudflare Pages Git-Integration nutzen.
3. Auf GitHub: Repository > Settings > Pages > Build and deployment > Source: Deploy from a branch > main / (root) > Save. Die dort angezeigte URL teilen, sobald der Build erfolgreich ist.
4. Spätere Updates: Dateien im gleichen Repo ersetzen, Commit und Push in GitHub Desktop. Bei Änderungen an den Spieldateien die CACHE-Version in sw.js erhöhen.

## Cloudflare Pages (privates Repo möglich)
Workers & Pages > Create application > Pages > Connect to Git; dieses Repo auswählen. Framework preset: None; Build command leer; Build output directory: / (Projektwurzel). Die erzeugte pages.dev-URL teilen. Alternativ separate Web-Upload-ZIP über Direct Upload veröffentlichen; Direct Upload und Git-Integration sind unterschiedliche Projekttypen.

## Lokal testen
Ordner in VS Code Insiders öffnen. Terminal: `python -m http.server 8080 --bind 127.0.0.1` (Windows ggf. `py` statt `python`). Im Browser http://127.0.0.1:8080 öffnen. Kein LAN-Zugriff nötig.

## Alpha-Hinweise
Einmal online laden, Offline-Cache benötigt erfolgreichen Service-Worker-Install. Spielstände bleiben lokal pro Browser/Origin, keine Synchronisierung. Browserdaten nicht löschen. Keine echten Zahlungen, kein globales PvP, kein Anti-Cheat. GM-Menü in dieser Spielerversion deaktiviert, clientseitig nicht manipulationssicher. Safari/iPhone auf echtem Gerät noch zu testen. Keine bestehenden Deep-Frontier-Repositories verändert.
