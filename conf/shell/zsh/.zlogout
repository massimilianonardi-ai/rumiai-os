rumiai_shell_zdotdir="$ZDOTDIR"
ZDOTDIR="$m_SHELL_ZDOTDIR"

if [ -r "$ZDOTDIR/.zlogout" ]
then
  . "$ZDOTDIR/.zlogout"
fi

m_SHELL_ZDOTDIR="${ZDOTDIR:-$HOME}"
ZDOTDIR="$rumiai_shell_zdotdir"

export m_SHELL_ZDOTDIR ZDOTDIR
unset rumiai_shell_zdotdir
