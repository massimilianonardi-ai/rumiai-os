rumiai_shell_zdotdir="$ZDOTDIR"
ZDOTDIR="$m_SHELL_ZDOTDIR"

if [ -r "$ZDOTDIR/.zshrc" ]
then
  . "$ZDOTDIR/.zshrc"
fi

m_SHELL_ZDOTDIR="${ZDOTDIR:-$HOME}"
ZDOTDIR="$rumiai_shell_zdotdir"

export m_SHELL_ZDOTDIR ZDOTDIR
unset rumiai_shell_zdotdir

. "$m_LIB_DIR/sh/core.lib.sh"

ZDOTDIR="$m_SHELL_ZDOTDIR"
export ZDOTDIR
