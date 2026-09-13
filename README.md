# RumiAI OS

RumiAI OS contains the technical `m` substrate and the branded RumiAI product entrypoints built on top of it.

Current implementation status: active Model 2.0 migration on `main`. The technical runtime is `m`; `rumiai-os-sh` is the branded shell entrypoint, and `rumiai-os` currently delegates to the same shell-oriented baseline while its future GUI role remains separate from the technical runtime contract.

## Entrypoints

```text
m
```

`m` bootstraps the technical runtime. Commands owned by the `m` layer use:

```text
#!/usr/bin/env m
```

The runtime is exposed on the technical PATH through:

```text
bin/sys/m -> ../../m
```

The branded RumiAI entrypoints are:

```text
rumiai-os
rumiai-os-sh
```

`rumiai-os-sh` activates the RumiAI executable layer and enters the shell. `rumiai-os` currently follows the same shell-oriented baseline; this is an implementation state of the migration, not a permanent GUI contract.

## Executable layout

```text
bin/sys/          platform-independent m commands
bin/sys-*/        platform-specific m commands
bin/sys-osarch    active relative link to bin/sys-<osarch>/
bin/ext/          platform-independent package executables
bin/ext-*/        platform-specific package executables
bin/ext-osarch    active relative link to bin/ext-<osarch>/
bin/ai/           platform-independent RumiAI commands
bin/ai-*/         platform-specific RumiAI commands
bin/ai-osarch     active relative link to bin/ai-<osarch>/
```

The `m` runtime PATH is ordered as:

```text
sys-osarch : sys : ext-osarch : ext : host PATH
```

RumiAI activation prepends:

```text
ai-osarch : ai
```

## Libraries and packages

Technical shell libraries live under:

```text
lib/sys/sh/<name>.lib.sh
```

RumiAI-specific libraries use the corresponding `lib/ai/<runtime>/` layer when present.

The package store and package catalog belong to the `m` substrate. Package launchers resolve mutable state through `state-path`; they do not depend on legacy top-level `conf`, `data`, `home`, `cache`, `log`, `run`, or `tmp` roots.

## State

Mutable state is rooted at:

```text
state/
```

The bootstrap exports only the state roots required by Model 2.0:

```text
m_STATE_DIR
m_STATE_SYS_DIR
m_STATE_USER_DIR
```

System state is selected through the profile selector:

```text
state/system/current -> profile/<profile>
```

The initial tracked profile is `main`. User state is isolated by the current POSIX principal under `state/user/<host-id>-<uid>/`.

The public state resolver is:

```text
state-path <scope> <owner> <identity> <area> [<state-instance>]
```

Consumers use `state-path` instead of reconstructing the physical state layout. Package `var/<area>` links are the deliberate exception: they remain system-scoped and follow `state/system/current` so newly started package processes observe the selected system profile.

Package launch HOME is resolved from user package state. RumiAI-managed package configuration lives under the reserved `.m/` namespace inside the package configuration area; for example, launcher environment configuration is read from `<package-conf>/.m/env`.

## Product metadata

The current branded product metadata is stored as scalar files:

```text
product-name
product-version
```

`product-version` is not advanced to `2.0.0` until the Model 2.0 migration, permanent tests, applicable physical validation, and final consistency checks are complete.

## Language and shell configuration locations

The current implementation keeps language catalogs under:

```text
lang/
```

and the tracked shell configuration for the initial system profile under:

```text
state/system/profile/main/sys/shell/conf/
```

These are current implementation locations. The final generic static-resource layout is deliberately deferred until after the Model 2.0 migration; neither location should be interpreted as fixing a general resource taxonomy before that separate design work is completed.

## Platform activation

The canonical platform identifier has the form:

```text
<platform>-<architecture>
```

Current native tokens are `linux`, `macos`, `windows` and `arm64`, `x86_64`. `osarch-update` is explicit; the bootstrap does not invoke it automatically.

## Development workspace

`src/` may contain independent local checkouts such as `rumiai-tests` and `rumiai-dev-PoCs`. Its operational contents are ignored by Git and are not runtime dependencies.

## Portability

Shell code targets POSIX.1-2024 / The Open Group Base Specifications Issue 8.

Direct command shebang execution additionally requires host support for executable `#!` scripts and `/usr/bin/env` at that pathname.
