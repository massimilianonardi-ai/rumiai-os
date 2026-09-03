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

rumiai_shell_load_only="1"
. "$m_BOOTSTRAP_BIN"
unset rumiai_shell_load_only

ZDOTDIR="$m_SHELL_ZDOTDIR"
export ZDOTDIR
