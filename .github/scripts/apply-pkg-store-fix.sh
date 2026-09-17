#!/bin/sh
set -eu

source_dir=$1
expected=14e413342261b23df840f40b355166c4d55f1b41

cd "$source_dir"
git fetch --quiet origin main
[ "$(git rev-parse HEAD)" = "$expected" ]
[ "$(git rev-parse origin/main)" = "$expected" ]

python3 - <<'PY'
from pathlib import Path

path = Path('lib/sys/sh/pkg-install.lib.sh')
text = path.read_text()
old = '''  for pkg_install_operand
  do
    _pkg_install_operand_parse "$pkg_install_operand" || return 2
  done

  pkg_install_work_parent="$(command -- state-path system sys pkg tmp)" || return 1
  umask 077
'''
new = '''  for pkg_install_operand
  do
    _pkg_install_operand_parse "$pkg_install_operand" || return 2
  done

  umask 077
  command -p -- mkdir -p -- "$m_PKG_DIR" || return 1
  [ -d "$m_PKG_DIR" ] && [ ! -L "$m_PKG_DIR" ] || return 1

  pkg_install_work_parent="$(command -- state-path system sys pkg tmp)" || return 1
'''
if text.count(old) != 1:
    raise SystemExit('unexpected pkg_install source shape')
path.write_text(text.replace(old, new, 1))

path = Path('res/sys/manual/pkg')
text = path.read_text()
old = '''    install <package-spec>...
        Install one or more requested packages through the current catalog and
        package integration pipeline.
'''
new = '''    install <package-spec>...
        Install one or more requested packages through the current catalog and
        package integration pipeline. After all package operands pass syntax
        validation, materialize $m_PKG_DIR on demand when it does not yet exist.
        Invalid package operands do not create the package store.
'''
if text.count(old) != 1:
    raise SystemExit('unexpected pkg manual shape')
text = text.replace(old, new, 1)
old = '''    $m_PKG_DIR
        Managed package store root.
'''
new = '''    $m_PKG_DIR
        Managed package store root. pkg install creates this directory on demand
        after package operands have passed syntax validation.
'''
if text.count(old) != 1:
    raise SystemExit('unexpected pkg manual FILES shape')
path.write_text(text.replace(old, new, 1))
PY

cat > res/sys/manual/pkg-install.lib.sh <<'EOF'
NAME
    pkg-install.lib.sh - orchestrate package installation

DESCRIPTION
    pkg-install.lib.sh implements the installation orchestration used by the
    public pkg install command. It validates every package operand before
    installation side effects, materializes the managed package store on demand,
    snapshots the package catalog, resolves package repository metadata and
    artifacts, downloads and verifies artifacts, extracts/materializes them, and
    delegates final package integration to the package integration facilities.

FUNCTIONS
    pkg_install <package-spec>...
        Install one or more package specifications through the real package
        pipeline. Every operand is validated before the package store or temporary
        installation state is materialized. If $m_PKG_DIR does not exist after
        validation, it is created before package integration begins. An existing
        $m_PKG_DIR must be a real directory rather than a symbolic link.

        Returns 0 when all requested packages are installed, 1 when installation
        cannot be completed, and 2 when the invocation or a package operand is
        invalid.

DEPENDENCIES
    The library runs inside the m bootstrap environment and uses the package
    download, extraction and integration libraries together with state-path,
    repository adapters and the external pkg-catalog source.

SEE ALSO
    pkg
    state-path
EOF

sh -n lib/sys/sh/pkg-install.lib.sh
git diff --check
[ "$(grep -c '^pkg_install()' lib/sys/sh/pkg-install.lib.sh)" -eq 1 ]
# Library manual must not expose underscore-prefixed internal functions.
! grep -E '^[[:space:]]*_[A-Za-z0-9_]+\(' res/sys/manual/pkg-install.lib.sh

git config user.name 'RumiAI task automation'
git config user.email 'actions@users.noreply.github.com'
git add -- lib/sys/sh/pkg-install.lib.sh res/sys/manual/pkg res/sys/manual/pkg-install.lib.sh
[ "$(git diff --cached --name-only | wc -l | tr -d ' ')" -eq 3 ]
git commit -m 'Materialize package store during install'
git push origin HEAD:main
