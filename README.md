# RumiAI OS

RumiAI OS is the portable bootstrap/runtime layer for RumiAI.

Current implementation status: POSIX bootstrap/runtime with semantic executable roots, minimal `lang` resolver/logger, interactive shell entry and source-command interpretation.

## CLI

```text
rumiai-os
```

Bootstraps the RumiAI environment and enters `$SHELL`, falling back to `sh` when `SHELL` is not set.

```text
rumiai-os file [args...]
```

Bootstraps RumiAI and sources the explicitly supplied readable regular file. A RumiAI command that is also directly executable can use:

```text
#!/usr/bin/env rumiai-os
```

## Layout

```text
rumiai-os        runtime/front controller
bin/             executable-directory container
bin/sys/         platform-independent RumiAI commands and runtime exposure
bin/sys-*/       platform-specific RumiAI commands
bin/ext/         platform-independent third-party executables
bin/ext-*/       platform-specific third-party executables
lang/            UTF-8 language catalogs
src/             ignored local development workspace
```

The active portable runtime is exposed through the relative symlink:

```text
bin/sys/rumiai-os -> ../../rumiai-os
```

The public `log` command is platform-independent RumiAI functionality and lives at:

```text
bin/sys/log
```

`src/` may contain independent local checkouts such as `rumiai-tests` and `rumiai-dev-PoCs`; its operational contents are ignored by Git and are not runtime dependencies.

## Language catalogs

Catalogs use reusable semantic domains rather than component-specific bootstrap domains:

```text
lang/<language_TERRITORY>/filesystem/<message-id>
lang/<language_TERRITORY>/execution/<message-id>
lang/<language_TERRITORY>/security/<message-id>
```

The fallback catalog is `en_US`. When selected, `lang/current` is a relative symlink to a language directory.

## Portability

Shell code targets POSIX.1-2024 / The Open Group Base Specifications Issue 8.

Direct command shebang execution additionally requires host support for executable `#!` scripts and `/usr/bin/env` at that pathname.
