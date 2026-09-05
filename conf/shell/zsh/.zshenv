if [ "${m_SHELL_ZDOTDIR+x}" = "x" ]
then
  ZDOTDIR="$m_SHELL_ZDOTDIR"
  export ZDOTDIR

  if [ -r "$ZDOTDIR/.zshenv" ]
  then
    . "$ZDOTDIR/.zshenv"
  fi
else
  unset ZDOTDIR

  if [ -r "$HOME/.zshenv" ]
  then
    . "$HOME/.zshenv"
  fi
fi
