# KURWA WARS – Modular Browser Alpha

## Starten und entwickeln (Node.js 18+)

```sh
npm run dev
```

- Spieler: http://127.0.0.1:8080/
- GM: http://127.0.0.1:8080/gm.html
- Live Spieler: https://xxfallenangelxx.github.io/kurwa-wars-alpha/
- Live GM: https://xxfallenangelxx.github.io/kurwa-wars-alpha/gm.html

Keine npm-Pakete und kein Build-Server nötig. Der Dev-Server baut den Engine-HTML-String bei jeder Anforderung aus den lesbaren Quellen neu. Browser neu laden, um Änderungen zu sehen.

## Struktur

| Pfad | Aufgabe |
|---|---|
| index.html / gm.html | Separate kurze Startseiten, gemeinsamer Spielkern |
| src/engine/core/ | Grundsysteme, Inhalte, Items, Spielstände, Kampf, HQ, Expeditionen |
| src/engine/features/ | Quests, Lokalisierung, Chat, Loot, Tutorial, Placement |
| src/engine/frame.html / manifest.json | Exakte Reihenfolge der Engine-Script- und CSS-Blöcke |
| src/host/ | Browser-Bridge, Audio, GM-Zugang, Eingabe/Oberfläche, Desktop |
| src/styles/ | UI-Stylesheets |
| assets/packs/ | Bestehende, unveränderte Laufzeit-Asset-Pakete |
| assets/audio/ | Separates Audio-Datenpaket |
| assets/raw/ | Einzelne bearbeitbare Bild-/Audio-Dateien nach Unpack |
| generated/engine-template.js | Generiertes Laufzeit-Bundle, nicht manuell bearbeiten |
| world-layout.js | Veröffentlichtes Layout für alle Spieler |
| scripts/ | Build, Checks, Dev-Server, Asset-Tools |

## Assets einzeln bearbeiten

```sh
npm run assets:unpack
```

Entpackt die bestehenden Pakete verlustfrei in echte WebP-/Audio-Dateien unter assets/raw. Bereits entpackte/bearbeitete Dateien werden nicht überschrieben. Die Zuordnung zu den alten IDs steht in assets/raw/manifest.json. Nach Medienänderungen:

```sh
npm run assets:pack
npm run check
```

Die alten Asset-Pfade im Hauptverzeichnis bleiben vorerst als Kompatibilitätskopien für bereits installierte PWA-Versionen erhalten. Neue Startseiten laden ausschließlich die strukturierten Pfade.

## Source-Code ändern und veröffentlichen

Die Engine verwendet bewusst klassische Scripts mit gemeinsamem globalem Scope. Die Manifest-Reihenfolge und die bisherigen Script-Grenzen bleiben erhalten; kein ungeprüfter ES-Modul-Umbau. Dadurch bleiben Hoisting, überschreibende Feature-Patches und Save-Keys erhalten. Einheiten innerhalb eines ursprünglichen Script-Blocks werden beim Build exakt zusammengefügt. Änderungen in src/host werden direkt geladen.

```sh
npm run build
npm run check
```

In GitHub Desktop Quelländerungen und generiertes Bundle gemeinsam committen und auf main pushen. GitHub Pages veröffentlicht weiterhin die Projektwurzel; der Build ist bereits eingecheckt. Bei reinem Placement-Update reicht die Änderung an world-layout.js. Normale Spielstände und GM-Entwürfe bleiben im lokalen Browser getrennt. Der GM-Modus ist ein lokaler Testmodus, keine serverseitige Authentifizierung.

## Bisherige Hosting- und Alpha-Hinweise

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

## Achievement-System (v0.58)

`src/engine/features/07-achievements.js` erweitert die bisherigen 18 Erfolge auf 100 kosmetische Erfolge. Die alten Save-Keys bleiben unverändert; neue IDs sind stabil. Das Modul wird vom Engine-Bridge nach den bisherigen klassischen Scripts geladen. Die Bilder liegen in einem 10×10-Atlas (`assets/achievements/atlas.webp`, 1280×1280). Die Karten verwenden positionsgenaue CSS-Sprites; bei fehlendem Atlas bleiben sie mit Symbol-Fallback spielbar. Der Atlas wird bei erfolgreichem Abruf vom Service Worker zur Offline-Nutzung gecacht. Die neue Liste scrollt separat, ihre Position bleibt bei UI-Updates erhalten.
