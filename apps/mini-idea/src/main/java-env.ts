// Environment for every JVM we start (language server, javac, java).
// The JVM takes its file-name and console encoding from the locale. Apps started without a
// UTF-8 locale (containers, services, some desktop launchers) would hand that on, and the JVM
// then cannot open paths like "Mein Projekt ü" or prints "Gr??e" (BUG-003, BUG-004).

const UTF8 = /utf-?8/i;

export function hasUtf8Locale(env: NodeJS.ProcessEnv): boolean {
  // LC_ALL overrides LC_CTYPE, which overrides LANG (POSIX precedence).
  const effective = env.LC_ALL || env.LC_CTYPE || env.LANG || '';
  return UTF8.test(effective);
}

export function javaEnv(base: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): NodeJS.ProcessEnv {
  const env = { ...base };
  if (platform !== 'win32' && !hasUtf8Locale(env)) {
    // C.UTF-8 ships with glibc >= 2.35 and musl; macOS understands a bare UTF-8 LC_CTYPE.
    if (platform === 'darwin') env.LC_CTYPE = 'UTF-8';
    else env.LC_ALL = 'C.UTF-8';
  }
  return env;
}

/** JVM flags that make console output UTF-8 regardless of locale (JDK 19+; ignored by older JDKs). */
export const JAVA_UTF8_FLAGS = ['-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-Dstderr.encoding=UTF-8'];
