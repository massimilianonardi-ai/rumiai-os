# RumiAI OS

RumiAI OS is the portable bootstrap/runtime layer for RumiAI.

Current implementation status: POSIX bootstrap/runtime with semantic executable roots, minimal `lang` resolver/logger, explicit language/platform utilities, interactive shell entry and source-command interpretation.

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

Platform-independent system commands include:

```text
log [args...]
lang <domain> <message-id>
lang-set [language]
osarch-update
```

`lang` delegates to the bootstrap language resolver. `lang-set` reports the effective current language and available catalog counts when called without arguments, or selects an existing language with one argument. `osarch-update` detects the native platform, creates the matching platform-specific executable directories when needed, and refreshes the active relative symlinks.

## Layout

```text
rumiai-os        runtime/front controller
bin/             executable-directory container
bin/sys/         platform-independent RumiAI commands and runtime exposure
bin/sys-*/       platform-specific RumiAI commands
bin/sys-osarch   active relative symlink to bin/sys-<osarch>/
bin/ext/         platform-independent third-party executables
bin/ext-*/       platform-specific third-party executables
bin/ext-osarch   active relative symlink to bin/ext-<osarch>/
lang/            UTF-8 language catalogs
src/             ignored local development workspace
```

The active portable runtime is exposed through the relative symlink:

```text
bin/sys/rumiai-os -> ../../rumiai-os
```

Platform-independent RumiAI system commands live under `bin/sys/`.

`src/` may contain independent local checkouts such as `rumiai-tests` and `rumiai-dev-PoCs`; its operational contents are ignored by Git and are not runtime dependencies.

## Language catalogs

Catalogs use reusable semantic domains rather than component-specific bootstrap domains:

```text
lang/<language_TERRITORY>/filesystem/<message-id>
lang/<language_TERRITORY>/execution/<message-id>
lang/<language_TERRITORY>/security/<message-id>
```

The fallback catalog is `en_US`. Language selection is represented by the relative symlink `lang/current -> <language_TERRITORY>`; if no valid selection exists, the resolver uses the `en_US` fallback.

`lang-set` with no arguments emits one `current<TAB><language>` row followed by `<language><TAB><non-empty-message-count>` for each available language.

## Platform activation

The canonical platform identifier has the form:

```text
<platform>-<architecture>
```

Current native tokens are `linux`, `macos`, `windows` and `arm64`, `x86_64`. `osarch-update` is explicit; the bootstrap does not invoke it automatically.

## Portability

Shell code targets POSIX.1-2024 / The Open Group Base Specifications Issue 8.

Direct command shebang execution additionally requires host support for executable `#!` scripts and `/usr/bin/env` at that pathname.
