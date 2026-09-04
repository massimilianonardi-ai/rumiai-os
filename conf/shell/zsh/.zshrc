ZDOTDIR="$m_SHELL_ZDOTDIR"

if [ -r "$ZDOTDIR/.zshrc" ]
then
  . "$ZDOTDIR/.zshrc"
fi

m_SHELL_ZDOTDIR="${ZDOTDIR:-$HOME}"
ZDOTDIR="$m_SHELL_ZDOTDIR_INIT"

export m_SHELL_ZDOTDIR ZDOTDIR
unset m_SHELL_ZDOTDIR_INIT

. "$m_LIB_DIR/sh/core.lib.sh"

ZDOTDIR="$m_SHELL_ZDOTDIR"
export ZDOTDIR

if [ -f "$m_SHELL_EXT" ] && [ -r "$m_SHELL_EXT" ]
then
  . "$m_SHELL_EXT"
fi
