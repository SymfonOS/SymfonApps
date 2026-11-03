-- Mini-IDEA local state (SQLite, one file per user: <userData>/state.db)
-- Working name "Mini-IDEA" until /replica-brand picks a real one.
--
-- Conventions
--   ids        text, UUID v4 generated in the main process (SQLite has no gen_random_uuid)
--   times      integer, Unix epoch milliseconds, UTC
--   booleans   integer 0/1 with check constraint
--   json       text, validated with json_valid()
--   access     single local user. Only the Electron main process opens this file;
--              the renderer reaches it through the typed IPC allowlist (architecture.md).
--   on delete  decided per FK below. Deleting a project removes everything it owns.
--
-- Not stored here, on purpose:
--   file contents      live on disk
--   symbol/code index  owned by each language server (LSP); file-name index is in memory
--   modules/libraries  come from the build tool (Gradle/Maven) or the language server
--   git state          read from git itself, never mirrored

pragma foreign_keys = on;
pragma journal_mode = wal;

create table schema_version (
  version integer not null
);
insert into schema_version (version) values (1);

-- Projects the user has opened (S01 recent list, F01, F02, F03)
create table projects (
  id            text primary key,
  name          text not null,
  root_path     text not null unique,
  trusted       integer not null default 0 check (trusted in (0, 1)),
  pinned        integer not null default 0 check (pinned in (0, 1)),
  layout        text not null default '{}' check (json_valid(layout)),  -- tool window docking state
  last_opened_at integer,
  created_at    integer not null,
  updated_at    integer not null
);
create index projects_last_opened on projects (last_opened_at desc);

-- SDKs / runtimes the user registered (S02 JDK picker, S31)
create table sdks (
  id          text primary key,
  kind        text not null check (kind in ('jdk', 'node', 'python', 'go', 'other')),
  name        text not null,
  version     text,
  home_path   text not null unique,
  created_at  integer not null,
  updated_at  integer not null
);

-- Which SDK a project uses. The global default per kind is a setting
-- ('sdk.default.jdk' ...), not a row here, so the primary key never holds a null.
create table project_sdks (
  project_id  text not null references projects (id) on delete cascade,
  kind        text not null,
  sdk_id      text not null references sdks (id) on delete cascade,
  primary key (project_id, kind)
);
create index project_sdks_sdk on project_sdks (sdk_id);

-- Settings: global (project_id null) or per project (S29, F14).
-- Key is a dotted path, e.g. 'editor.fontSize'. Defaults live in code, not here.
create table settings (
  project_id  text references projects (id) on delete cascade,
  key         text not null,
  value       text not null check (json_valid(value)),
  updated_at  integer not null
);
create unique index settings_scope_key on settings (coalesce(project_id, ''), key);

-- Keymap overrides on top of the built-in keymap (S36). A row with
-- shortcut null removes the default binding for that action.
create table keybindings (
  id          text primary key,
  action_id   text not null,          -- e.g. 'editor.rename', 'search.everywhere'
  shortcut    text,                   -- normalised, e.g. 'Shift+F6', 'Shift Shift'
  context     text not null default 'global',  -- 'global' | 'editor' | 'tree' ...
  created_at  integer not null,
  updated_at  integer not null
);
create unique index keybindings_unique on keybindings (shortcut, context) where shortcut is not null;
create index keybindings_action on keybindings (action_id);

-- Open tabs, carets and splits, restored on reopen (S05, EditorState)
create table editor_states (
  project_id   text not null references projects (id) on delete cascade,
  file_path    text not null,          -- relative to project root
  split_group  integer not null default 0,
  tab_index    integer not null,
  pinned       integer not null default 0 check (pinned in (0, 1)),
  active       integer not null default 0 check (active in (0, 1)),
  view_state   text not null default '{}' check (json_valid(view_state)), -- caret, selection, scroll, folding
  updated_at   integer not null,
  primary key (project_id, split_group, file_path)
);

-- Recent files / recent locations (Ctrl+E)
create table recent_files (
  project_id  text not null references projects (id) on delete cascade,
  file_path   text not null,
  line        integer,
  opened_at   integer not null,
  primary key (project_id, file_path)
);
create index recent_files_opened on recent_files (project_id, opened_at desc);

-- Run / debug configurations (S16, F08, F09, F10)
create table run_configurations (
  id           text primary key,
  project_id   text not null references projects (id) on delete cascade,
  name         text not null,
  type         text not null check (type in (
                 'application', 'junit', 'gradle', 'maven', 'npm', 'shell', 'remote_debug')),
  options      text not null default '{}' check (json_valid(options)), -- main class, task, script, port ...
  args         text not null default '',
  vm_options   text not null default '',
  env          text not null default '{}' check (json_valid(env)),
  working_dir  text,
  before_launch text not null default '[]' check (json_valid(before_launch)),
  temporary    integer not null default 0 check (temporary in (0, 1)), -- created from a gutter click
  sort_order   integer not null default 0,
  created_at   integer not null,
  updated_at   integer not null,
  unique (project_id, name)
);
create index run_configurations_project on run_configurations (project_id, sort_order);

-- One row per run or debug session (S17, S18, S19)
create table run_sessions (
  id            text primary key,
  project_id    text not null references projects (id) on delete cascade,
  config_id     text references run_configurations (id) on delete set null, -- history survives deleting the config
  config_name   text not null,     -- snapshot, so history reads even after rename/delete
  mode          text not null check (mode in ('run', 'debug')),
  status        text not null default 'starting'
                  check (status in ('starting', 'running', 'paused', 'exited', 'failed', 'killed')),
  pid           integer,
  exit_code     integer,
  started_at    integer not null,
  ended_at      integer,
  check (ended_at is null or ended_at >= started_at)
);
create index run_sessions_project on run_sessions (project_id, started_at desc);
create index run_sessions_config on run_sessions (config_id);

-- Test results of a session (S19, F10)
create table test_results (
  id           text primary key,
  session_id   text not null references run_sessions (id) on delete cascade,
  parent_id    text references test_results (id) on delete cascade, -- suite -> case tree
  test_key     text not null,          -- stable id, e.g. 'com.acme.FooTest#bar'
  name         text not null,
  status       text not null check (status in ('running', 'passed', 'failed', 'ignored', 'errored')),
  duration_ms  integer,
  message      text,
  expected     text,
  actual       text,
  location     text,                   -- file:line for jump-to-source
  unique (session_id, test_key)
);
create index test_results_parent on test_results (parent_id);
create index test_results_status on test_results (session_id, status);

-- Breakpoints (S18, F09). Line numbers drift on edit; the editor updates them.
create table breakpoints (
  id              text primary key,
  project_id      text not null references projects (id) on delete cascade,
  kind            text not null default 'line' check (kind in ('line', 'exception', 'function')),
  file_path       text,                -- null for exception breakpoints
  line            integer,
  exception_class text,
  function_name   text,
  condition       text,
  log_message     text,                -- set = logpoint
  suspend         text not null default 'all' check (suspend in ('all', 'thread', 'none')),
  enabled         integer not null default 1 check (enabled in (0, 1)),
  created_at      integer not null,
  updated_at      integer not null,
  check (kind <> 'line' or (file_path is not null and line is not null)),
  check (kind <> 'exception' or exception_class is not null),
  check (kind <> 'function' or function_name is not null)
);
create unique index breakpoints_line on breakpoints (project_id, file_path, line) where kind = 'line';
create index breakpoints_project on breakpoints (project_id);

-- Watches in the debugger (S18)
create table watches (
  id          text primary key,
  project_id  text not null references projects (id) on delete cascade,
  expression  text not null,
  sort_order  integer not null default 0,
  created_at  integer not null
);
create index watches_project on watches (project_id, sort_order);

-- Bookmarks (S33, could)
create table bookmarks (
  id           text primary key,
  project_id   text not null references projects (id) on delete cascade,
  file_path    text not null,
  line         integer not null,
  mnemonic     text check (mnemonic is null or length(mnemonic) = 1),
  description  text,
  created_at   integer not null
);
create unique index bookmarks_mnemonic on bookmarks (project_id, mnemonic) where mnemonic is not null;
create index bookmarks_file on bookmarks (project_id, file_path);

-- Changelists (S21). Files are assigned by path; git still owns the actual diff.
create table changelists (
  id          text primary key,
  project_id  text not null references projects (id) on delete cascade,
  name        text not null,
  active      integer not null default 0 check (active in (0, 1)),
  comment     text,                    -- draft commit message
  created_at  integer not null,
  updated_at  integer not null,
  unique (project_id, name)
);
create unique index changelists_one_active on changelists (project_id) where active = 1;

create table changelist_files (
  changelist_id text not null references changelists (id) on delete cascade,
  project_id    text not null references projects (id) on delete cascade,
  file_path     text not null,
  primary key (project_id, file_path)    -- a file sits in exactly one changelist
);
create index changelist_files_list on changelist_files (changelist_id);

-- Shelved changes (could)
create table shelves (
  id          text primary key,
  project_id  text not null references projects (id) on delete cascade,
  name        text not null,
  patch       text not null,           -- unified diff
  created_at  integer not null
);
create index shelves_project on shelves (project_id, created_at desc);

-- Local history (S32). Content is deduplicated by hash.
create table history_blobs (
  hash        text primary key,        -- sha256 of content
  content     blob not null,           -- zstd-compressed
  size        integer not null
);

create table history_entries (
  id          text primary key,
  project_id  text not null references projects (id) on delete cascade,
  file_path   text not null,
  blob_hash   text references history_blobs (hash) on delete restrict, -- null = file deleted
  label       text,                    -- 'External change', 'Before refactoring', user label
  created_at  integer not null
);
create index history_entries_file on history_entries (project_id, file_path, created_at desc);
create index history_entries_blob on history_entries (blob_hash);
create index history_entries_age on history_entries (created_at);  -- pruning job

-- Database tool window connections (S28, could). Passwords go to the OS keychain, never here.
create table data_sources (
  id          text primary key,
  project_id  text not null references projects (id) on delete cascade,
  name        text not null,
  driver      text not null check (driver in ('postgres', 'mysql', 'sqlite')),
  url         text not null,
  username    text,
  keychain_ref text,
  created_at  integer not null,
  updated_at  integer not null
);
create index data_sources_project on data_sources (project_id);

-- Installed plugins (could, own extension API only)
create table plugins (
  id          text primary key,        -- plugin's own reverse-DNS id
  version     text not null,
  enabled     integer not null default 1 check (enabled in (0, 1)),
  install_path text not null,
  installed_at integer not null
);
