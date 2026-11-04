// Seeds a development profile: demo projects on disk plus a state database that
// lists them as recent projects (one trusted, one untrusted, one empty).
//
//   node scripts/seed.mjs [targetDir]     default: ./.seed
//   HOBEL_USER_DATA=./.seed/user-data npm start
//
// All content is made up. Re-running replaces the target directory.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const appDir = path.resolve(import.meta.dirname, '..');
const target = path.resolve(process.argv[2] ?? path.join(appDir, '.seed'));
const projectsDir = path.join(target, 'projects');
const userData = path.join(target, 'user-data');

rmSync(target, { recursive: true, force: true });
mkdirSync(projectsDir, { recursive: true });
mkdirSync(userData, { recursive: true });

// 1) hello-java: the e2e fixture
cpSync(path.join(appDir, 'tests/fixtures/hello-java'), path.join(projectsDir, 'hello-java'), { recursive: true });

// 2) kassenbuch: a few packages, Maven layout, a deliberate warning and a failing run path
const kb = path.join(projectsDir, 'kassenbuch', 'src', 'main', 'java', 'de', 'beispiel', 'kasse');
mkdirSync(path.join(kb, 'model'), { recursive: true });
const files = {
  'Kassenbuch.java': `package de.beispiel.kasse;

import de.beispiel.kasse.model.Buchung;
import java.util.ArrayList;
import java.util.List;

public class Kassenbuch {
    private final List<Buchung> buchungen = new ArrayList<>();

    public void buche(Buchung b) {
        buchungen.add(b);
    }

    /** Saldo in Cent. */
    public long saldo() {
        return buchungen.stream().mapToLong(Buchung::betragCent).sum();
    }

    public static void main(String[] args) {
        Kassenbuch k = new Kassenbuch();
        k.buche(new Buchung("Anfangsbestand", 50_00));
        k.buche(new Buchung("Kaffee", -3_40));
        k.buche(new Buchung("Briefmarken", -8_50));
        System.out.printf("Saldo: %.2f EUR%n", k.saldo() / 100.0);
        if (args.length > 0 && args[0].equals("--fehler")) {
            throw new IllegalStateException("Absichtlicher Fehler für den Stacktrace-Link");
        }
    }
}
`,
  'model/Buchung.java': `package de.beispiel.kasse.model;

public record Buchung(String text, long betragCent) {
    public Buchung {
        if (text == null || text.isBlank()) throw new IllegalArgumentException("Text fehlt");
    }
}
`,
  'Export.java': `package de.beispiel.kasse;

import java.util.Date; // unbenutzt: erzeugt eine Warnung

class Export {
    String alsCsv(Kassenbuch k) {
        return "saldo;" + k.saldo();
    }
}
`,
};
for (const [name, content] of Object.entries(files)) writeFileSync(path.join(kb, name), content);

// 3) leer: an empty folder, for empty states
mkdirSync(path.join(projectsDir, 'leer'));

// State database with the app's schema
const db = new DatabaseSync(path.join(userData, 'state.db'));
db.exec('pragma foreign_keys = on;');
db.exec(readFileSync(path.resolve(appDir, '../../replica/schema.sql'), 'utf8'));
const now = Date.now();
const insert = db.prepare('insert into projects (id, name, root_path, trusted, last_opened_at, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)');
const ids = {};
for (const [i, [name, trusted]] of [['kassenbuch', 1], ['hello-java', 1], ['leer', 0]].entries()) {
  ids[name] = randomUUID();
  insert.run(ids[name], name, path.join(projectsDir, name), trusted, now - i * 3_600_000, now, now);
}
db.prepare(
  "insert into run_configurations (id, project_id, name, type, options, args, created_at, updated_at) values (?, ?, 'Kassenbuch', 'application', ?, '', ?, ?)",
).run(randomUUID(), ids.kassenbuch, JSON.stringify({ mainClass: 'de.beispiel.kasse.Kassenbuch', sourceRoot: 'src/main/java' }), now, now);
db.close();

console.log(`seeded ${target}\nstart with: HOBEL_USER_DATA=${userData} npm start`);
