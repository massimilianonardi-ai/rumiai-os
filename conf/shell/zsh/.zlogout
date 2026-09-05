if [ "${m_SHELL_ZDOTDIR+x}" = "x" ]
then
  ZDOTDIR="$m_SHELL_ZDOTDIR"
  export ZDOTDIR

  if [ -r "$ZDOTDIR/.zlogout" ]
  then
    . "$ZDOTDIR/.zlogout"
  fi
else
  unset ZDOTDIR

  if [ -r "$HOME/.zlogout" ]
  then
    . "$HOME/.zlogout"
  fi
fi
