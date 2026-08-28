# RumiAI OS

RumiAI OS is the portable bootstrap/runtime layer for RumiAI.

Current implementation status: initial POSIX bootstrap, minimal i18n/logger, Rumi shell, and source-command interpreter candidate promoted for physical validation.

## CLI

```text
rumiai-os
```

Bootstraps the RumiAI environment and enters the configured interactive Rumi shell.

```text
rumiai-os file [args...]
```

Bootstraps RumiAI and sources the explicitly supplied readable file. The file does not need executable permission or a shebang.

A RumiAI source that should also be directly executable can use:

```text
#!/usr/bin/env rumiai-os
```

Direct shebang execution requires an active environment in which `rumiai-os` is resolvable through `PATH`.

## Layout

```text
rumiai-os        runtime/front controller
bin/             executable RumiAI commands and runtime exposure
lib/             sourced runtime libraries
conf/            configuration
lang/            UTF-8 language catalogs
```

`bin/rumiai-os` is a structural symlink to the root runtime so that the portable Rumi shell, which prepends `bin/` to `PATH`, can execute commands using `#!/usr/bin/env rumiai-os` without modifying the host environment.

## Portability

Shell code targets POSIX.1-2024 / The Open Group Base Specifications Issue 8.

The direct command shebang convention additionally requires host support for executable `#!` scripts and `/usr/bin/env` at that pathname. Physical certification on macOS and Linux is the next validation gate.
