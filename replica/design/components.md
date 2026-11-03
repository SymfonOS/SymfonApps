# Components: Mini-IDEA

Specs für jede Komponente aus `replica/recon.md` → Components. Token-Namen
beziehen sich auf `tokens.json` (Farben als Tailwind-Rollen: `bg-surface`,
`text-text-muted`, `border-border-input`). Maße in px.

**Wo das herkommt:** Rollen, Dichte und Verhalten folgen IDE-Konventionen aus
der Recon. Werte sind nicht an IntelliJ gemessen (keine Screenshots) und
bewusst eigene. Icons: **Lucide** (ISC), Datei-Icons: **Material Icon Theme**
(MIT) oder eigene. Keine JetBrains-Icons, kein JetBrains Mono, keine Texte aus
IntelliJ.

**Basis:** React Aria Components für Dialoge, Menüs, Listen, Bäume, Tabs,
Tooltips (Tastatur und Screenreader fertig). Monaco für alles mit Code.
Dockview für Tool-Fenster.

**Für alle interaktiven Teile gilt:**
- Fokus sichtbar: 2px `focus-ring`, Offset 1px (innen bei dichten Listen), nur bei `:focus-visible`
- Hover `bg-hover`, ausgewählt `bg-selection`, ausgewählt ohne Fokus `bg-selection-inactive`
- disabled: `text-text-disabled`, kein Hover, `aria-disabled`, bleibt per Tab erreichbar in Menüs, nicht in Toolbars
- Übergänge `motion.fast`, bei `prefers-reduced-motion` keine
- Jede Aktion hat eine Action-ID aus der Keymap; Tooltips zeigen das Shortcut an

---

```
Button
  variants  primary, secondary, ghost, danger, link
  sizes     sm 24, md 28 (default), lg 32; Padding x 12 (sm 8)
  states    default, hover (accent-hover / bg-hover), active, focus-visible, disabled, loading
  tokens    primary: bg accent, text on-accent; secondary: bg surface-raised, border border, text text;
            ghost: transparent, hover bg-hover; danger: text danger, border danger; radius sm; font sm/500
  a11y      echtes <button>; Default-Button in Dialogen reagiert auf Enter; loading: aria-busy, Label bleibt
  used on   S01, S02, S03, S13, S16, S21, S29, S30
```

```
IconButton (Toolbar-Button)
  variants  toolbar, toggle (aria-pressed), split (Aktion + Pfeil-Menü)
  sizes     24 (Tool-Fenster), 28 (Main Toolbar); Icon 16
  states    default, hover, pressed/toggled (bg-selection-inactive), focus-visible, disabled
  tokens    icon text-muted, hover text; radius sm
  a11y      aria-label = Aktionsname; Tooltip mit Name + Shortcut nach 500 ms
  used on   S04, S06, S14, S17, S18, S19, S21, S22, S26
```

```
ToolWindowStripe
  variants  links, rechts, unten (horizontal)
  sizes     Breite stripe-w 40; Button 32×32; Icon 20
  states    inaktiv, aktiv (bg-selection-inactive + 2px Indikator accent an der Innenkante), hover, Badge (Punkt danger/warning/info)
  tokens    bg bg, border-r border
  a11y      role=toolbar, Pfeiltasten wechseln, Enter/Space toggelt; Alt+Zahl-Shortcuts laut Keymap
  used on   S04
```

```
ToolWindow (Container)
  variants  docked, floating, undocked, als Tab gruppiert, split
  sizes     Header 32; Default-Breite 280, Höhe 240; Splitter 4 (Hit-Area 8)
  states    sichtbar, versteckt, aktiv (Header-Titel text statt text-muted), maximiert, leer (Empty State)
  tokens    bg surface, Header border-b border, Titel font sm/600
  a11y      role=region mit aria-label; Esc gibt Fokus an den Editor zurück; Shift+Esc versteckt;
            Ctrl+Shift+F12 alle verstecken; Splitter per Tastatur (Ctrl+Shift+Pfeile)
  used on   S06, S07, S14, S15, S17–S22, S26–S28, S34
```

```
EditorTabs
  variants  normal, gepinnt (Pin-Icon, links sortiert), Vorschau (Titel kursiv, wird ersetzt), geändert (Punkt statt ×)
  sizes     Höhe tab-h 34; Padding x 12; max. 240 breit, dann Ellipsis mit Tooltip (voller Pfad)
  states    aktiv (bg editor-bg, 2px accent unten), inaktiv (bg surface), hover (× erscheint), Fehler (Name danger-Wellenlinie),
            Drag (Platzhalter), Überlauf (Scroll + Dropdown aller Tabs)
  tokens    text text-muted, aktiv text; font sm
  a11y      role=tablist; Ctrl+Tab Switcher, Ctrl+F4 schließen, Mittelklick schließen; Kontextmenü
  used on   S05
```

```
CodeEditor (Monaco)
  variants  Haupteditor, Diff (side by side / unified), Merge (3-Wege), Konsole, Einzeiler in Dialogen
  sizes     font code 13/20; Padding oben 4
  states    normal, read-only (Hinweisleiste oben), große Datei (kein Highlighting, Hinweis),
            Indexing (Completion zeigt „lädt“), leer (Empty State unten)
  tokens    bg editor-bg, aktuelle Zeile editor-line, Auswahl editor-selection, syntax-*,
            Wellenlinien: danger, warning, info; Caret text
  a11y      Monaco Accessibility-Modus an, wenn Screenreader erkannt; Alt+F1 Hilfe
  used on   S05, S23, S24, S17, S16
```

```
EditorEmptyState
  variants  keine Datei offen
  content   eigene Kurzliste: Search Everywhere, Datei öffnen, Recent Files, Terminal – jeweils mit Shortcut
  tokens    text text-muted, Shortcuts als Kbd; mittig
  a11y      reiner Text, Shortcuts als <kbd>
  used on   S05
```

```
Gutter
  parts     Zeilennummern, Breakpoint-Spalte, Run-Icons, VCS-Marker (3px Balken), Folding-Pfeile
  sizes     min. gutter-w-min 48, wächst mit Zeilenzahl; Icon 14
  states    default, hover (Breakpoint-Geist 40 % Deckkraft), Breakpoint aktiv/deaktiviert (Ring)/bedingt (Punkt mit ?)/Logpoint (Raute),
            aktuelle Ausführungszeile (Pfeil + Zeile bg warning-bg)
  tokens    bg gutter-bg; line-number, line-number-active; breakpoint; vcs-added/-modified/-deleted
  a11y      Breakpoint per Ctrl+F8 an der Caret-Zeile (nicht nur Maus); Run-Icon per Alt+Enter-Menü erreichbar
  used on   S05, S23, S24
```

```
Tree
  variants  Dateibaum, Struktur, Ergebnisbaum (Usages, Tests, Problems), Checkbox-Baum (Commit), Settings-Navigation
  sizes     Zeile row-h 24; Einzug 16 pro Ebene; Icon 16, Abstand 6
  states    collapsed, expanded, loading (Spinner statt Pfeil), selected, selected-inactive, Mehrfachauswahl,
            Drop-Ziel (2px focus-ring außen), Speed Search (Treffer accent-hinterlegt, Suchfeld oben rechts), leer
  tokens    text text, sekundäre Info (Pfad, Anzahl) text-muted; ignorierte Dateien text-disabled;
            VCS-Farben am Dateinamen: vcs-modified-text, vcs-added-text (die Balken-Farben vcs-* sind nur für Gutter-Marker, zu wenig Kontrast für Text)
  a11y      role=tree, aria-expanded, aria-level; Pfeiltasten, Home/End, * alle aufklappen, Tippen startet Speed Search;
            virtualisiert (react-aria Virtualizer), aria-setsize/posinset korrekt
  used on   S06, S07, S14, S15, S19, S21, S22, S26, S29
```

```
PopupList (Completion, Aktionen, Choose Implementation, Branches)
  variants  Completion (Icon + Name + Typ rechts), Aktionsliste (Name + Shortcut), Gruppiert (Überschriften)
  sizes     Zeile row-h 24; max. 12 Zeilen sichtbar; Breite 320–560
  states    gefüllt, gefiltert (Treffer-Zeichen fett), leer („Keine Vorschläge“), lädt (Zeile mit Spinner), Auswahl
  tokens    bg surface-raised, shadow pop, radius md, border border; Auswahl bg selection
  a11y      role=listbox, aria-activedescendant (Fokus bleibt im Editor); Pfeile, Enter, Tab (ersetzen), Esc
  used on   S08, S10, S11, S25
```

```
SearchEverywhere (Popup)
  layout    Tabs oben (All, Dateien, Symbole, Aktionen, Text), Eingabe, Ergebnisliste gruppiert, optionale Vorschau unten
  sizes     Breite popup-w-search 680; oben im Fenster bei 15 %
  states    leer (Recent Files), Ergebnisse, keine Treffer (Vorschlag: „In Bibliotheken suchen“), Index läuft (Hinweis)
  tokens    wie PopupList; Eingabe font base
  a11y      role=dialog mit Combobox; Tab wechselt Tabs; Doppel-Shift öffnet; Esc schließt und stellt Fokus wieder her
  used on   S08
```

```
HoverPopup (Doku, Fehler, Typ-Info)
  variants  Doku (Markdown gerendert), Problem (Meldung + Quick-Fix-Link), Info
  sizes     max. 560 breit, 360 hoch, scrollt
  states    lädt, gefüllt, keine Doku
  tokens    bg surface-raised, shadow pop, radius md; Code in font mono
  a11y      öffnet auch per Ctrl+Q; fokussierbar mit Tab, Esc schließt; role=tooltip nur für reine Kurzinfos
  used on   S05, S12
```

```
InlineInput (Rename, Find in File)
  variants  Rename-Box am Symbol, Find/Replace-Leiste oben im Editor
  sizes     Höhe 24
  states    aktiv, keine Treffer (Feld-Rand danger + „0 von 0“), Konflikt (Hinweis darunter), Regex-Fehler
  tokens    bg editor-bg, border focus-ring; Treffer-Highlight warning-bg
  a11y      Enter bestätigt, Esc bricht ab; Trefferzahl als aria-live=polite
  used on   S05, S13
```

```
Dialog
  variants  modal klein (Bestätigung), Formular, Settings (Baum links, Inhalt rechts, Suche oben), Wizard (Schritte)
  sizes     klein 420, Formular 560, Settings dialog-w-settings 960 × 640, skalierbar
  states    default, Fehler (Meldung oben + Feld markiert), Apply aktiv (geänderte Einträge mit Punkt im Baum), lädt
  tokens    bg surface, shadow dialog, radius lg; Fußleiste border-t border: [Hilfe] … [Abbrechen] [Apply] [OK]
  a11y      role=dialog, aria-modal, Fokus-Falle, Fokus auf erstes Feld, Esc = Abbrechen, Enter = Default-Button
  used on   S02, S13, S16, S29, S31
```

```
FormField
  variants  Text, Number, Dropdown (Select/Combobox), Checkbox, Radio, Pfad-Picker (Feld + Ordner-Button), SDK-Picker
            (Liste + „Herunterladen…“), Key-Value-Tabelle (Env), Shortcut-Recorder
  sizes     Höhe control-md 28; Label links (Settings) oder oben (Wizard)
  states    default, focus (Rand focus-ring), error (Rand danger + Meldung darunter), disabled, read-only
  tokens    bg editor-bg, border border-input, radius sm, font sm
  a11y      <label for>, Fehler per aria-describedby; Shortcut-Recorder: Enter startet Aufnahme, Esc bricht ab
  used on   S02, S03, S16, S29, S36
```

```
Console (Run, Debug, Terminal)
  variants  Prozessausgabe (Monaco read-only), Terminal (xterm.js)
  states    läuft, beendet (Zeile „Prozess beendet mit Code n“), Fehlerausgabe (stderr in danger), Links (Pfad:Zeile, URL, Stacktrace)
  tokens    bg editor-bg, font code; Links link + Unterstrich bei Hover
  a11y      Terminal: Screenreader-Modus von xterm.js; Links per Tastatur (Ctrl+Klick, Alt+Enter im Kontext)
  used on   S17, S18, S20
```

```
DataGrid
  variants  Variablen (Baum + Spalten Name/Wert/Typ), Tabellen-Editor (DB)
  sizes     Zeile row-h 24; Spalten skalierbar
  states    lädt, gefüllt, geändert (Zelle warning-bg), Fehler, leer
  tokens    Kopf bg surface, font xs/600 text-muted; Zellen font code
  a11y      role=grid (react-aria Table), Pfeiltasten, F2 bearbeiten, Enter bestätigt
  used on   S18, S28
```

```
LogGraph
  layout    Graph-Spalte, Subject, Autor, Datum; Details rechts
  states    lädt seitenweise, gefüllt, gefiltert, leer
  tokens    Branch-Linien aus fester eigener 8-Farben-Reihe (syntax-* als Quelle), HEAD-Label bg accent text on-accent
  a11y      Zeilen als Grid; Graph ist dekorativ (aria-hidden), Info zusätzlich im Text (Branch-Namen)
  used on   S22
```

```
Notification (Balloon)
  variants  info, warning, error, success; mit bis zu 2 Aktionen
  sizes     Breite 360; unten rechts über der Statusleiste
  states    eingeblendet (verschwindet nach 8 s, außer error), Hover hält, im Notification-Fenster archiviert
  tokens    bg surface-raised, shadow pop, radius md; Icon in info/warning/danger/success
  a11y      role=status (info) bzw. role=alert (error); Fokus wird nicht gestohlen; im Fenster S33 nachlesbar
  used on   überall, S33
```

```
StatusBar + Widget
  parts     links Navigationspfad/Breadcrumbs, rechts: Hintergrund-Tasks (Fortschritt), Zeile:Spalte, Zeilenende, Encoding, Einrückung, Branch, Sprachserver-Status
  sizes     Höhe statusbar-h 24; Widgets padding x 8; font xs
  states    idle, Task läuft (Balken 2px accent + Text), Fehler (Sprachserver abgestürzt: Icon danger)
  tokens    bg bg, border-t border, text text-muted
  a11y      jedes Widget ein Button mit aria-label; Fortschritt role=progressbar
  used on   S35
```

```
Breadcrumbs
  states    default, hover (Element unterstrichen), Popup mit Geschwistern
  tokens    text text-muted, Trenner ›, aktuelles Element text; font xs
  a11y      nav aria-label="Breadcrumbs", aria-current am letzten
  used on   S05
```

```
InlayHint
  variants  Parametername, Typ, Code Vision (Verwendungen, Autor)
  tokens    text text-muted, bg hover, radius xs, font code in 12
  a11y      dekorativ für Screenreader (Monaco), Info zusätzlich per Ctrl+P / Hover
  used on   S05
```

```
Squiggle (Highlighting)
  variants  error (danger), warning (warning), weak warning (gestrichelt text-muted), typo (gepunktet info), unbenutzt (Text text-disabled)
  a11y      F2 / Shift+F2 springt zum nächsten Problem; Meldung im Hover und in Problems; nie nur Farbe: Form unterscheidet sich
  used on   S05
```

```
MainToolbar + Widgets
  parts     Hauptmenü, Projekt-Widget, Branch-Widget, rechts Run-Konfiguration + Run/Debug/Stop, Suche, Settings
  sizes     Höhe toolbar-h 40; Widgets control-md 28, padding x 8
  states    default, Popup offen (bg selection-inactive), läuft (Stop-Button danger, Run-Icon mit Punkt)
  tokens    bg bg, border-b border; Projektname font sm/600
  a11y      role=toolbar; jedes Widget Button mit Menü (aria-haspopup); fensterverschiebbar außerhalb der Buttons
  used on   S04
```

```
Welcome-Screen-Elemente (RecentProjectRow, Seitennav)
  RecentProjectRow  Zeile 48: Projekt-Initialen-Kachel (32, Farbe aus Namen-Hash), Name font sm/600, Pfad text-muted xs; hover, selected; Kontextmenü (entfernen, im Dateimanager zeigen)
  Seitennav         Einträge row-h-lg 28, ausgewählt bg selection
  a11y              Liste role=listbox, Enter öffnet, Entf entfernt (mit Bestätigung)
  used on           S01
```

```
Kbd
  tokens    bg surface-raised, border border, radius xs, font xs mono, padding x 4
  used on   Tooltips, Empty States, Menüs, Keymap
```

```
ContextMenu / Menu
  sizes     Zeile row-h 24; Breite min. 200; Shortcut rechts text-muted
  states    default, hover/aktiv bg selection, disabled, Untermenü (Pfeil), Trenner, Checkbox-Einträge
  tokens    bg surface-raised, shadow pop, radius md, padding y 4
  a11y      role=menu, Pfeiltasten, Typeahead, Esc schließt Ebene; Shift+F10 öffnet Kontextmenü
  used on   überall
```

```
Badge / Counter
  variants  neutral, accent, danger, warning
  sizes     Höhe 16, padding x 6, radius pill, font 2xs/600
  used on   S15 (Anzahl Probleme), S21 (Anzahl Dateien), ToolWindowStripe
```

```
ProgressIndicator
  variants  Spinner 16, Balken 2px (Statusleiste), bestimmter Balken mit Prozent (Dialoge)
  a11y      role=progressbar mit aria-valuenow, wenn bekannt
  used on   S03, S04, S26, S35
```
